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

// Which synced Budget Sync run is being looked at — shared by the Pacing tab
// and the Budget Sync inspector, which each pick a run the same way.
//
// The selection is derived during render from the user's explicit choice,
// falling back to a default; no effect copies query data into state.

import { useState } from "react";
import { useBudgetSyncRun, useBudgetSyncRuns } from "../../api/useCampaignTracker";
import type { BudgetSyncRunSummary } from "./budgetSyncTypes";

const EMPTY_RUNS: BudgetSyncRunSummary[] = [];

// Runs arrive received_at DESC, unsorted by (year, month) — so the default pick
// can't just be runs[0], which could land on an old re-sync. Prefer an exact
// match for today's real (year, month); otherwise the run nearest to it by
// calendar distance (ties keep the first — i.e. most recently received).
function pickDefaultRun(rs: BudgetSyncRunSummary[]): BudgetSyncRunSummary {
  const now = new Date();
  const currentKey = now.getFullYear() * 12 + now.getMonth();
  const exact = rs.find((r) => r.budget_year === now.getFullYear() && r.reviewed_month === now.getMonth());
  if (exact) return exact;
  return rs.reduce((best, r) => {
    const d = Math.abs(r.budget_year * 12 + r.reviewed_month - currentKey);
    const bd = Math.abs(best.budget_year * 12 + best.reviewed_month - currentKey);
    return d < bd ? r : best;
  }, rs[0]);
}

export function useBudgetSyncRunSelection() {
  const runsQ = useBudgetSyncRuns();
  const runs = runsQ.data ?? EMPTY_RUNS;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const run = runs.length ? (runs.find((r) => r.id === selectedId) ?? pickDefaultRun(runs)) : null;
  const detailQ = useBudgetSyncRun(run?.id ?? null);

  // Every run is scoped to one reviewed (year, month), so picking by year+month
  // (rather than one combined dropdown) is the natural way to browse them.
  // Runs arrive received_at DESC, so the first match for a given (year, month)
  // is always its newest re-sync.
  const years = Array.from(new Set(runs.map((r) => r.budget_year))).sort((a, b) => b - a);
  const monthsForYear = (year: number) =>
    Array.from(new Set(runs.filter((r) => r.budget_year === year).map((r) => r.reviewed_month))).sort((a, b) => a - b);
  const selectRunFor = (year: number, monthIdx: number) => {
    const match = runs.find((r) => r.budget_year === year && r.reviewed_month === monthIdx);
    if (match) setSelectedId(match.id);
  };

  return { runsQ, runs, run, detailQ, years, monthsForYear, selectRunFor };
}
