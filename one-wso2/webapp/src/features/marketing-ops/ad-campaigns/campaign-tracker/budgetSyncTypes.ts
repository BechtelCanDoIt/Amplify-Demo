// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// Ad Campaigns → Campaign Tracker → Budget Sync wire types.
//
// Field names stay plain snake_case end-to-end, matching the backend exactly
// (no camelCase mapping layer) — same convention as the BU ownership registry
// types in useCampaignTracker.ts. This surface is read-only (ingest is
// machine-to-machine, from the Google Sheets budget connector add-on) and the payload is
// deeply nested, so a mapper would add cost with nothing to write back.

export interface SyncCell {
  unit: string;
  tab_label: string;
  side: "BU" | "Regional";
  region: string;
  bu: string;
  is_buffer: boolean;
  // Always all twelve months — a sync is a full-year snapshot.
  amounts: number[];
}

export interface SyncSource {
  unit: string;
  sheet: string;
  sheet_tab: string;
  kept_rows: number;
  amounts: number[];
}

export interface SyncExclusion {
  detail: string;
  reason: string;
  amount: number;
}

export interface SyncAuditEntry {
  unit: string;
  sheet: string;
  claimed_rows: number;
  included: number;
  excluded: number;
  included_amount: number;
  excluded_amount: number;
  excluded_list: SyncExclusion[];
}

export interface SyncAudit {
  unit: string;
  entries: SyncAuditEntry[];
}

export interface BudgetSyncWarning {
  code: string;
  message: string;
}

// One row of GET /runs — enough to populate the run picker without fetching
// every run's full payload. `reviewed_month` is 0-indexed.
export interface BudgetSyncRunSummary {
  id: string;
  spreadsheet_id: string;
  budget_year: number;
  reviewed_month: number;
  ruleset_version: string;
  generated_at: string;
  generated_by: string | null;
  received_at: string;
  total_month: number;
  total_month_buffer: number;
  missing_sheets: string[];
  warnings: BudgetSyncWarning[];
}

// GET /runs/{id} — the summary fields plus the full original sync payload
// nested under `payload`. One call per run; no separate /payload fetch needed.
export interface BudgetSyncRunDetail extends BudgetSyncRunSummary {
  payload: {
    month: string;
    month_index: number;
    units: { id: string; label: string; enabled: boolean }[];
    totals: { month: number; month_buffer: number };
    cells: SyncCell[];
    sources: SyncSource[];
    audit: SyncAudit[];
  };
}

// GET /pacing-lines — deliberately unfiltered by campaign status (a paused
// campaign's month-to-date spend still counts toward a budget line's pace),
// unlike /budget-pacing, which is Active-only and feeds the separate Budget
// Pacing tab.
export interface PacingLine {
  id: string;
  campaign_name: string;
  platform: string;
  status: string | null;
  live: boolean;
  daily_budget: number | null;
  daily_budget_is_derived: boolean | null;
  mtd_spend: number;
  clicks: number;
}
