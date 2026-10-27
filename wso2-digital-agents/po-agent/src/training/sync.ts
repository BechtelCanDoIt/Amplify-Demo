// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Training & Certification playbook sync (v1.1.0). Mirrors the PO-policy sync
// pattern: fetch all supported docs from a designated Drive folder, concatenate
// with "=== Title ===" separators, UPSERT into agent_training_corpus. Runs once
// at startup (with a short retry loop for DNS races) and then on a recurring
// interval configurable via TRAINING_SYNC_INTERVAL_HOURS.
//
// The Drive folder is owned and edited by the Training & Certification team.
// It is a separate folder from the PO-policy folder, but reuses the same
// OAuth user refresh token (drive.readonly scope covers any folder that user
// has been shared on — one OAuth identity, multiple Drive folders).

import { config } from "../config";
import { fetchAllPolicyDocs } from "../policy/drive";  // generic fetcher, name is legacy — accepts any folder ID
import { saveTrainingCorpus } from "../db/training";

let inFlight = false;

function buildCorpusText(docs: { name: string; content: string }[]): string {
  return docs
    .map((d) => `=== ${d.name} ===\n${d.content.trim()}`)
    .join("\n\n");
}

// Returns true if the sync produced or refreshed the corpus (or found nothing
// to do), false only when a caught exception means retry could help. Mirrors
// runPolicySync's contract so the startup retry loop can decide correctly.
export async function runTrainingSync(): Promise<boolean> {
  if (inFlight) {
    console.log("[training-sync] Sync already in flight — skipping this tick");
    return false;
  }
  if (!config.training.driveFolderId) {
    console.warn("[training-sync] TRAINING_DRIVE_FOLDER_ID not set — skipping sync");
    return true;  // config issue, not transient; no point retrying
  }
  inFlight = true;
  const start = Date.now();
  try {
    console.log("[training-sync] Starting Drive sync for folder", config.training.driveFolderId);
    const { docs, skipped } = await fetchAllPolicyDocs(config.training.driveFolderId);

    if (skipped.length > 0) {
      console.warn(
        "[training-sync] Skipped", skipped.length, "unsupported file(s):",
        skipped.map((s) => `${s.name} (${s.mimeType})`).join(", ")
      );
    }

    if (docs.length === 0) {
      console.warn("[training-sync] No supported training docs found in folder — corpus not updated");
      return true;
    }

    const corpus = buildCorpusText(docs);
    await saveTrainingCorpus(corpus, docs.length);
    const elapsed = Date.now() - start;
    console.log(
      "[training-sync] Sync complete —",
      docs.length, "doc(s),",
      Buffer.byteLength(corpus, "utf8"), "bytes,",
      elapsed, "ms"
    );
    return true;
  } catch (err: any) {
    console.error(
      "[training-sync] Sync failed —",
      err?.response?.data ?? err?.message ?? err
    );
    return false;
  } finally {
    inFlight = false;
  }
}

// Pod-startup retry sequence: immediate, then 30s, then 2min. Same rationale
// as the PO-policy sync — the pod's DNS resolver can be flaky in the first
// seconds after boot in some Choreo/K8s configurations, and we don't want to
// wait a full interval before the corpus is available.
const STARTUP_RETRY_DELAYS_MS = [0, 30_000, 120_000];

async function runWithStartupRetries(): Promise<void> {
  for (let i = 0; i < STARTUP_RETRY_DELAYS_MS.length; i++) {
    const delay = STARTUP_RETRY_DELAYS_MS[i];
    if (delay > 0) {
      console.log(`[training-sync] Retrying startup sync in ${delay / 1000}s (attempt ${i + 1}/${STARTUP_RETRY_DELAYS_MS.length})`);
      await new Promise((r) => setTimeout(r, delay));
    }
    if (await runTrainingSync()) return;
  }
  console.warn(
    "[training-sync] Startup retries exhausted — corpus will catch up on the next scheduled tick",
  );
}

// Schedule the sync. Returns a NodeJS.Timeout that the caller may keep for
// testing / shutdown, though the agent process is long-running so it's fine
// to ignore the return. Returns undefined when the sync is disabled via
// TRAINING_SYNC_ENABLED=false.
export function startTrainingSync(): NodeJS.Timeout | undefined {
  if (!config.training.syncEnabled) {
    console.log("[training-sync] Disabled via TRAINING_SYNC_ENABLED=false — skipping startup sync and interval");
    return undefined;
  }
  if (!config.training.driveFolderId) {
    console.warn("[training-sync] TRAINING_DRIVE_FOLDER_ID not configured — skipping startup sync and interval");
    return undefined;
  }
  void runWithStartupRetries();
  const intervalMs = config.training.syncIntervalHours * 60 * 60 * 1000;
  return setInterval(() => void runTrainingSync(), intervalMs);
}
