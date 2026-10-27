// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "./client";
import { encrypt, decrypt } from "./crypto";

export async function getMessages(
  googleUserId: string
): Promise<Anthropic.MessageParam[]> {
  const [rows] = await getPool().execute(
    `SELECT messages FROM agent_conversations WHERE google_user_id = ?`,
    [googleUserId]
  );
  const row = (rows as any[])[0];
  if (!row) return [];

  try {
    // mysql2 may return JSON columns as already-parsed objects depending on configuration
    const raw = typeof row.messages === "string" ? row.messages : JSON.stringify(row.messages);
    // Attempt to decrypt — returns null for legacy plaintext rows (treat as empty history)
    const decrypted = decrypt(raw);
    if (decrypted === null) {
      console.warn("[conversations] Could not decrypt messages for user — starting fresh");
      return [];
    }
    const parsed = JSON.parse(decrypted) as Anthropic.MessageParam[];
    // Compact + sanitize on load too, so legacy rows saved before this change
    // (full tool blocks, longer windows) get a free benefit on the first
    // turn after deploy, not just on the subsequent save.
    return sanitizeMessages(compactMessages(parsed));
  } catch {
    return [];
  }
}

// Rolling-window cap on conversation history. Tuned alongside the tool-block
// stripping below — most conversational context the model uses lives in the
// last few turns of natural-language text, not in dozens of stale tool_use /
// tool_result blocks. 20 keeps enough back-context for "what did we talk
// about earlier" recall while bounding the worst-case token spend. Multi-turn
// flows (leave apply, vehicle add) sit around 8–12 messages, so 20 leaves
// comfortable headroom without carrying long-forgotten context each turn.
const MAX_MESSAGES = 20;

// Tool-result payloads can balloon (a leave-history fetch returns up to 20
// records; vehicle list, pending leaves, issue lists all carry full row data).
// Once a tool_result is older than the last couple of turns the model never
// re-uses it — but it still ships every turn after, multiplying input cost.
// Strategy: keep tool_use / tool_result blocks intact only for the last N
// "real" turns (user text → assistant response); for older turns, drop the
// tool blocks entirely and keep only the natural-language text. Within the
// kept window, individual tool_result bodies are also capped to bound any
// single oversized response.
const TURNS_TO_KEEP_TOOLS = 2;
const TOOL_RESULT_MAX_CHARS = 800;

// Strip from the front until we reach a clean conversation start:
// must be a user message whose content is plain text (not tool_results).
// Trimming can otherwise leave an orphaned tool_result with no preceding tool_use,
// which the Anthropic API rejects. Also applied on load to fix already-corrupted history.
function sanitizeMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  let result = messages;
  while (result.length > 0) {
    const first = result[0];
    if (first.role !== "user") { result = result.slice(1); continue; }
    const content = first.content;
    const isToolResult = Array.isArray(content) && content.length > 0 &&
      (content[0] as any).type === "tool_result";
    if (isToolResult) { result = result.slice(1); continue; }
    break;
  }
  return result;
}

// Walk backwards through the history counting "real" user turns (plain-text
// user messages, NOT the synthetic user messages that carry tool_result
// blocks back to the model). Returns the index of the user message that
// starts the Nth-from-last real turn — everything before that index is
// "old" and gets its tool blocks stripped.
function findRecentTurnBoundary(messages: Anthropic.MessageParam[], turnsToKeep: number): number {
  let seen = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const isToolResultOnly = Array.isArray(m.content) && m.content.length > 0 &&
      m.content.every((c) => (c as { type?: string }).type === "tool_result");
    if (isToolResultOnly) continue;
    seen++;
    if (seen === turnsToKeep) return i;
  }
  return 0;
}

function truncateToolResultText(text: string): string {
  if (text.length <= TOOL_RESULT_MAX_CHARS) return text;
  return text.slice(0, TOOL_RESULT_MAX_CHARS)
    + "\n\n[older entries trimmed — call the tool again if you need full data]";
}

// For messages within the "recent" window: bound the size of any individual
// tool_result block so a single fat response doesn't blow the per-turn budget.
function capToolResultSize(m: Anthropic.MessageParam): Anthropic.MessageParam {
  if (!Array.isArray(m.content)) return m;
  const cappedContent = m.content.map((block) => {
    const b = block as { type?: string; content?: unknown };
    if (b.type !== "tool_result") return block;
    if (typeof b.content === "string") {
      return { ...b, content: truncateToolResultText(b.content) };
    }
    if (Array.isArray(b.content)) {
      return {
        ...b,
        content: b.content.map((part) => {
          const p = part as { type?: string; text?: string };
          if (p.type === "text" && typeof p.text === "string") {
            return { ...p, text: truncateToolResultText(p.text) };
          }
          return part;
        }),
      };
    }
    return block;
  });
  return { ...m, content: cappedContent } as Anthropic.MessageParam;
}

// For messages BEFORE the recent-turn boundary: drop tool_use blocks
// (from assistant messages) and tool_result blocks (from user messages),
// keeping only text blocks. Messages that end up empty after stripping are
// removed entirely. Plain-string content is left untouched.
function stripToolBlocks(m: Anthropic.MessageParam): Anthropic.MessageParam | null {
  if (typeof m.content === "string") return m;
  if (!Array.isArray(m.content)) return m;
  const textOnly = m.content.filter((block) => {
    const b = block as { type?: string };
    return b.type === "text";
  });
  if (textOnly.length === 0) return null;
  return { ...m, content: textOnly } as Anthropic.MessageParam;
}

// Compact conversation history: strip tool blocks from old turns and cap
// individual tool_result sizes within the kept window. The model still sees
// every prior user text and assistant text reply for context, but doesn't
// carry every stale leave-history blob forward.
function compactMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages;
  const boundary = findRecentTurnBoundary(messages, TURNS_TO_KEEP_TOOLS);
  const out: Anthropic.MessageParam[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (i >= boundary) {
      out.push(capToolResultSize(messages[i]));
    } else {
      const stripped = stripToolBlocks(messages[i]);
      if (stripped) out.push(stripped);
    }
  }
  return out;
}

export async function saveMessages(
  googleUserId: string,
  messages: Anthropic.MessageParam[]
): Promise<void> {
  // Order matters: window-trim first (cheaper to compact a smaller array),
  // then strip tool blocks from old turns within the kept window, then a
  // final sanitize to ensure the head is a clean user text message (stripping
  // can leave an orphan tool_result at the front if the old window started
  // mid-tool-flow).
  const windowed = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  const trimmed = sanitizeMessages(compactMessages(windowed));
  await getPool().execute(
    `INSERT INTO agent_conversations (google_user_id, messages, last_activity)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       messages      = VALUES(messages),
       last_activity = NOW()`,
    [googleUserId, encrypt(JSON.stringify(trimmed))]
  );
}

export async function clearMessages(googleUserId: string): Promise<void> {
  await getPool().execute(
    `DELETE FROM agent_conversations WHERE google_user_id = ?`,
    [googleUserId]
  );
}

export async function deleteStaleConversations(): Promise<void> {
  await getPool().execute(
    `DELETE FROM agent_conversations
     WHERE last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY)`
  );
}
