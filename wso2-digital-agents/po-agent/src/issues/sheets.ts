// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Google Sheets client for user-reported issue tracking.
//
// Reuses the same OAuth refresh token as the PO-policy Drive sync (a real
// wso2.com user authorises the bot once; the token grants both `drive.readonly`
// and `spreadsheets`). The configured spreadsheet must be shared with that
// user — see docs/google-setup.md "Issues sheet" section.
//
// Sheet shape (after first write — auto-populated by ensureHeaders):
//   A: issue_id        (sequential int)
//   B: reporter_email
//   C: reported_at     (ISO timestamp)
//   D: description
//   E: status          (Initial | In-Progress | Fixed)
//   F: dev_comment     (free-form, edited by dev team)
//   G: updated_at      (ISO timestamp, refreshed when status/comment changes)

import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { config } from "../config";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

// Tab name within the spreadsheet. Default "Sheet1" matches a freshly created
// Google Sheet, so the operator doesn't have to rename anything before deploy.
const TAB = "Sheet1";

const HEADER_ROW = [
  "issue_id",
  "reporter_email",
  "reported_at",
  "description",
  "status",
  "dev_comment",
  "updated_at",
];

export type IssueStatus = "Initial" | "In-Progress" | "Fixed";

export interface Issue {
  issueId: number;
  reporterEmail: string;
  reportedAt: string;   // ISO timestamp
  description: string;
  status: IssueStatus;
  devComment: string;
  updatedAt: string;
}

// Module-level OAuth client; lazily initialised on first use. google-auth-library
// caches the access token internally and refreshes via the refresh token when
// expired, so one client across many calls is cheap.
let oauth2Client: OAuth2Client | null = null;

function getOAuthClient(): OAuth2Client {
  if (!oauth2Client) {
    oauth2Client = new OAuth2Client(
      config.policy.oauthClientId,
      config.policy.oauthClientSecret,
    );
    oauth2Client.setCredentials({
      refresh_token: config.policy.oauthRefreshToken,
    });
  }
  return oauth2Client;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { token } = await getOAuthClient().getAccessToken();
  if (!token) throw new Error("Failed to obtain Sheets access token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Internal: header bootstrap ──────────────────────────────────────────────

// Returns true if A1 in the configured tab matches our expected header. We only
// check A1 (issue_id) rather than the full row — close enough to detect "fresh
// empty sheet" vs "already initialised" without being fussy.
async function headersExist(headers: Record<string, string>): Promise<boolean> {
  const url = `${SHEETS_API}/${config.issues.sheetId}/values/${encodeURIComponent(TAB)}!A1`;
  const resp = await axios.get(url, { headers, validateStatus: () => true });
  if (resp.status !== 200) {
    throw new Error(`Sheets header probe failed: HTTP ${resp.status} — ${JSON.stringify(resp.data)}`);
  }
  const cell: string | undefined = resp.data?.values?.[0]?.[0];
  return cell === HEADER_ROW[0];
}

async function writeHeaders(headers: Record<string, string>): Promise<void> {
  const url = `${SHEETS_API}/${config.issues.sheetId}/values/${encodeURIComponent(TAB)}!A1:G1?valueInputOption=RAW`;
  await axios.put(url, { values: [HEADER_ROW] }, { headers });
}

// Idempotent — only writes the header row if A1 isn't already populated with
// our schema's first column name. Cheap (single A1 read on the happy path).
async function ensureHeaders(): Promise<void> {
  const h = await authHeaders();
  if (!(await headersExist(h))) {
    await writeHeaders(h);
  }
}

// ── Read ────────────────────────────────────────────────────────────────────

// Reads every data row (skipping the header), parses into Issue objects, and
// drops rows that don't match the schema (missing issue_id, malformed status).
// Used for both dedup-corpus generation and per-user history lookups.
// Exported so callers that need both "open issues" and "this user's issues" in
// the same turn can read once and filter twice, avoiding a redundant API hop.
export async function readAllIssues(): Promise<Issue[]> {
  await ensureHeaders();
  const h = await authHeaders();
  const url = `${SHEETS_API}/${config.issues.sheetId}/values/${encodeURIComponent(TAB)}!A2:G`;
  const resp = await axios.get(url, { headers: h });
  const rows: string[][] = resp.data?.values ?? [];

  const issues: Issue[] = [];
  for (const row of rows) {
    const id = parseInt(row[0] ?? "", 10);
    if (Number.isNaN(id)) continue; // skip malformed rows (e.g. blank line in the middle)
    const status = (row[4] ?? "Initial") as string;
    if (status !== "Initial" && status !== "In-Progress" && status !== "Fixed") {
      // unknown status — skip rather than guess. Dev team can fix manually.
      continue;
    }
    issues.push({
      issueId: id,
      reporterEmail: row[1] ?? "",
      reportedAt: row[2] ?? "",
      description: row[3] ?? "",
      status: status as IssueStatus,
      devComment: row[5] ?? "",
      updatedAt: row[6] ?? "",
    });
  }
  return issues;
}

export async function listOpenIssues(): Promise<Issue[]> {
  const all = await readAllIssues();
  return all.filter((i) => i.status !== "Fixed");
}

export async function getIssuesByReporter(email: string): Promise<Issue[]> {
  const all = await readAllIssues();
  const lc = email.trim().toLowerCase();
  return all
    .filter((i) => i.reporterEmail.trim().toLowerCase() === lc)
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

// ── Write ───────────────────────────────────────────────────────────────────

// Appends a new issue row and returns the assigned issue_id. ID is generated
// by reading max(issue_id) from the existing data and incrementing — at this
// app's volume the race window for two concurrent appends colliding on an ID
// is acceptable; dev team can merge if it ever happens.
export async function reportIssue(args: { email: string; description: string }): Promise<{ issueId: number }> {
  await ensureHeaders();
  const h = await authHeaders();

  const existing = await readAllIssues();
  const nextId = existing.length === 0
    ? 1
    : Math.max(...existing.map((i) => i.issueId)) + 1;
  const now = new Date().toISOString();
  const row = [
    String(nextId),
    args.email,
    now,
    args.description,
    "Initial",
    "",
    now,
  ];

  const url = `${SHEETS_API}/${config.issues.sheetId}/values/${encodeURIComponent(TAB)}!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await axios.post(url, { values: [row] }, { headers: h });
  return { issueId: nextId };
}
