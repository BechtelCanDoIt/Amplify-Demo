// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// PO policy sync — fetches all docs from the configured Drive folder,
// concatenates them with title separators, and persists to MySQL. Run once
// at startup (so a freshly-deployed pod has the corpus quickly) and then
// on a recurring interval.

import { config } from "../config";
import { fetchAllPolicyDocs } from "./drive";
import { saveCorpus } from "../db/policy";

let inFlight = false;

function buildCorpusText(docs: { name: string; content: string }[]): string {
  return docs
    .map((d) => `=== ${d.name} ===\n${d.content.trim()}`)
    .join("\n\n");
}

// Returns true if the sync produced or refreshed the corpus, false if it
// failed (caught error) or had nothing to do (no supported docs). The
// boolean lets the startup retry loop decide whether to try again.
export async function runPolicySync(): Promise<boolean> {
  if (inFlight) {
    console.log("[policy-sync] Sync already in flight — skipping this tick");
    return false;
  }
  inFlight = true;
  const start = Date.now();
  try {
    console.log("[policy-sync] Starting Drive sync for folder", config.policy.driveFolderId);
    const { docs, skipped } = await fetchAllPolicyDocs(config.policy.driveFolderId);

    if (skipped.length > 0) {
      console.warn(
        "[policy-sync] Skipped", skipped.length, "unsupported file(s):",
        skipped.map((s) => `${s.name} (${s.mimeType})`).join(", ")
      );
    }

    if (docs.length === 0) {
      console.warn("[policy-sync] No supported policy docs found in folder — corpus not updated");
      // Treat as "nothing to retry" — config / folder state, not a transient issue.
      return true;
    }

    const corpus = buildCorpusText(docs);
    await saveCorpus(corpus, docs.length);
    const elapsed = Date.now() - start;
    console.log(
      "[policy-sync] Sync complete —",
      docs.length, "doc(s),",
      Buffer.byteLength(corpus, "utf8"), "bytes,",
      elapsed, "ms"
    );
    return true;
  } catch (err: any) {
    console.error(
      "[policy-sync] Sync failed —",
      err?.response?.data ?? err?.message ?? err
    );
    return false;
  } finally {
    inFlight = false;
  }
}

// Pod-startup retry sequence: immediate, then 30s, then 2min. Defends against
// the Kubernetes/Choreo DNS race where the pod's resolver isn't fully ready
// when the first sync fires (e.g. `EAI_AGAIN` on the oauth2.googleapis.com
// lookup). The regular setInterval below still runs every syncIntervalHours
// regardless — these retries just make sure a fresh pod has the corpus
// before the first chat turn arrives, instead of waiting up to 24h.
const STARTUP_RETRY_DELAYS_MS = [0, 30_000, 120_000];

async function runWithStartupRetries(): Promise<void> {
  for (let i = 0; i < STARTUP_RETRY_DELAYS_MS.length; i++) {
    const delay = STARTUP_RETRY_DELAYS_MS[i];
    if (delay > 0) {
      console.log(`[policy-sync] Retrying startup sync in ${delay / 1000}s (attempt ${i + 1}/${STARTUP_RETRY_DELAYS_MS.length})`);
      await new Promise((r) => setTimeout(r, delay));
    }
    if (await runPolicySync()) return;
  }
  console.warn(
    "[policy-sync] Startup retries exhausted — corpus will catch up on the next scheduled tick",
  );
}

// Schedule the sync. Returns a NodeJS.Timeout that the caller may keep
// for testing / shutdown, though the agent process is long-running so it's
// fine to ignore the return. Returns undefined when the sync is disabled
// via HR_POLICY_SYNC_ENABLED=false — see config.policy.syncEnabled.
export function startPolicySync(): NodeJS.Timeout | undefined {
  if (!config.policy.syncEnabled) {
    console.log("[policy-sync] Disabled via HR_POLICY_SYNC_ENABLED=false — skipping startup sync and interval");
    return undefined;
  }
  // Kick off the retry sequence so a fresh pod is useful within seconds
  // (and survives DNS races during pod startup). Errors are logged inside
  // runPolicySync — never rethrow into startup.
  void runWithStartupRetries();
  const intervalMs = config.policy.syncIntervalHours * 60 * 60 * 1000;
  return setInterval(() => void runPolicySync(), intervalMs);
}
