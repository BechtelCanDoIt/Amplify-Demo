// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import { getPool } from "./client";

export interface AuditEntry {
  googleUserId: string;
  wso2Email: string;
  action: string;
  responseStatus: "SUCCESS" | "FAILED" | "BLOCKED";
  responseMessage?: string;
}

export async function logAction(entry: AuditEntry): Promise<void> {
  await getPool().execute(
    `INSERT INTO agent_audit_log
       (google_user_id, wso2_email, action, response_status, response_message)
     VALUES (?, ?, ?, ?, ?)`,
    [entry.googleUserId, entry.wso2Email, entry.action, entry.responseStatus, entry.responseMessage ?? null]
  );
}

export interface LlmCallEntry {
  sessionId: string;
  googleUserId: string;
  wso2Email?: string;
  round: number;
  stopReason?: string;
  toolsCalled: string[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// Sum of input+output tokens this user has spent in the last `hours` hours.
// Used by the per-user quota gate in processMessage. The (google_user_id,
// created_at) composite index in agent_llm_call_log keeps this query fast
// even as the table grows.
export async function getTokenUsageInWindow(googleUserId: string, hours: number): Promise<number> {
  const [rows] = await getPool().execute(
    `SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS total
     FROM agent_llm_call_log
     WHERE google_user_id = ? AND created_at > NOW() - INTERVAL ? HOUR`,
    [googleUserId, hours],
  );
  const total = (rows as Array<{ total: number | string }>)[0]?.total ?? 0;
  // SUM over BIGINT comes back as string in mysql2's default mode.
  return typeof total === "string" ? parseInt(total, 10) : total;
}

export async function logLlmCall(entry: LlmCallEntry): Promise<void> {
  await getPool().execute(
    `INSERT INTO agent_llm_call_log
       (session_id, google_user_id, wso2_email, round, stop_reason, tools_called, input_tokens, output_tokens, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.sessionId,
      entry.googleUserId,
      entry.wso2Email ?? null,
      entry.round,
      entry.stopReason ?? null,
      JSON.stringify(entry.toolsCalled),
      entry.inputTokens,
      entry.outputTokens,
      entry.durationMs,
    ]
  );
}
