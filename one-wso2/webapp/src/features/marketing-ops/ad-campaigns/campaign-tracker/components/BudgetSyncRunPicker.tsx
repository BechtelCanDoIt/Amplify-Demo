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

// The Year / Month run picker shared by the Pacing tab and the Budget Sync
// inspector, plus the loading / error / empty states for the run list. Each
// sync is an immutable, append-only run, so this is a plain history picker.

import type { ReactNode } from "react";
import { Box, MenuItem, Select, Typography } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import type { BudgetSyncRunSummary } from "../budgetSyncTypes";
import { TrackerLoading } from "./campaignTrackerPrimitives";
import { FilterLabel } from "./FilterControls";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SELECT_SX = { height: 34, fontSize: "0.78rem", bgcolor: "background.default" } as const;

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** What to show instead of the picker while the run list is loading, failed, or empty. */
export function RunsStatus({ pending, error }: { pending: boolean; error: unknown }) {
  if (pending) return <TrackerLoading messages={["Loading synced runs…"]} />;
  if (error) return <Typography sx={{ fontSize: "0.76rem", color: "error.main" }}>{describeError(error)}</Typography>;
  return (
    <Typography sx={{ fontSize: "0.76rem", color: "text.disabled", textAlign: "center", py: 3 }}>
      No Budget Sync runs yet — the connector hasn't synced this workbook.
    </Typography>
  );
}

/** `children` render between the Month select and the run caption (e.g. the Pacing day control). */
export function RunPicker({
  run,
  years,
  monthsForYear,
  onSelect,
  children,
}: {
  run: BudgetSyncRunSummary;
  years: number[];
  monthsForYear: (year: number) => number[];
  onSelect: (year: number, monthIndex: number) => void;
  children?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, mb: 2, flexWrap: "wrap" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <FilterLabel>Year</FilterLabel>
        <Select
          size="small"
          value={run.budget_year}
          onChange={(e) => {
            const year = Number(e.target.value);
            const months = monthsForYear(year);
            // Keep the current month if that year has a run for it, else take the latest.
            onSelect(year, months.includes(run.reviewed_month) ? run.reviewed_month : months[months.length - 1]);
          }}
          sx={{ minWidth: 100, ...SELECT_SX }}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y} sx={{ fontSize: "0.8rem" }}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        <FilterLabel>Month</FilterLabel>
        <Select
          size="small"
          value={run.reviewed_month}
          onChange={(e) => onSelect(run.budget_year, Number(e.target.value))}
          sx={{ minWidth: 150, ...SELECT_SX }}
        >
          {monthsForYear(run.budget_year).map((m) => (
            <MenuItem key={m} value={m} sx={{ fontSize: "0.8rem" }}>
              {MONTH_NAMES[m] ?? m}
            </MenuItem>
          ))}
        </Select>
      </Box>
      {children}
      <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", pb: "7px" }}>
        Ruleset {run.ruleset_version} · Budget sync date: {fmtDateTime(run.received_at)} ({fmtRelative(run.received_at)})
      </Typography>
    </Box>
  );
}
