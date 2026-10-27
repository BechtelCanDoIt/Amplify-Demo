// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Known-thread tracking for the Chat thread-routing decision.
//
// The bot needs to know whether an inbound webhook's thread.name is a real
// reply into an existing thread vs a brand-new thread Chat auto-created for
// a top-level message. Google Chat's spaces.messages.list API would answer
// that, but it's blocked in DM spaces without Workspace admin approval — so
// we maintain our own ledger of threads we have already interacted with.
//
// Recorded by:
//   - the webhook handler, on every inbound message (so a follow-up reply in
//     the same thread is recognised next time round)
//   - the chat sender, after every outbound POST whose response carries a
//     fresh thread.name (so the user's reply into the bot's reply-thread is
//     recognised)
//
// All operations swallow errors — thread tracking is a UX nicety, not a
// correctness guarantee, and a DB blip should not break the chat path.

import { getPool } from "./client";

export async function isThreadKnown(spaceName: string, threadName: string): Promise<boolean> {
  try {
    const [rows] = await getPool().execute(
      "SELECT 1 FROM agent_known_threads WHERE space_name = ? AND thread_name = ? LIMIT 1",
      [spaceName, threadName],
    );
    return (rows as unknown[]).length > 0;
  } catch (err) {
    console.error("[thread] isThreadKnown failed:", err);
    return false;
  }
}

export async function recordThread(spaceName: string, threadName: string): Promise<void> {
  try {
    await getPool().execute(
      "INSERT IGNORE INTO agent_known_threads (space_name, thread_name) VALUES (?, ?)",
      [spaceName, threadName],
    );
  } catch (err) {
    console.error("[thread] recordThread failed:", err);
  }
}

// Purges thread rows older than the cutoff (default 90 days). If a user
// revives a stale thread after purge, the bot will fail-open to "main section"
// on the first follow-up, then re-record the thread; the second follow-up
// threads correctly. Same shape of forgiveness as agent_conversations.
const THREAD_TTL_DAYS = 90;

export async function purgeOldThreads(): Promise<void> {
  try {
    const [result] = await getPool().execute(
      "DELETE FROM agent_known_threads WHERE first_seen_at < NOW() - INTERVAL ? DAY",
      [THREAD_TTL_DAYS],
    );
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected > 0) {
      console.log(`[thread] purged ${affected} row(s) older than ${THREAD_TTL_DAYS} days`);
    }
  } catch (err) {
    console.error("[thread] purgeOldThreads failed:", err);
  }
}
