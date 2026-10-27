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

// The Pacing tab: how each budget line is tracking against real ad spend this
// month. Picks a synced Budget Sync run (the budget side), re-queries real
// Google Ads + LinkedIn spend through a chosen day of that run's month, and hands
// both to BudgetPacingSheet for the status board and forecast. The inspector for
// the synced plan itself (cells, sources, exclusions) is the Budget Sync tab.
//
// The day control sits beside the Year/Month pickers. `day` is what's applied
// (and re-fetches real spend on every change); `draft` is the input's live text,
// so typing a two-digit day or nudging the spinner doesn't fire a request per
// keystroke — only Apply (or Enter) commits it. It's tagged with its run id so
// it lapses on its own, back to that run's default day, when another run is
// picked.

import { useMemo, useState } from "react";
import { Box, Button, CircularProgress, TextField, Typography } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import { usePacingLines } from "../../../api/useCampaignTracker";
import { daysInMonth, defaultDay } from "../budgetPacingLogic";
import { useBudgetSyncRunSelection } from "../useBudgetSyncRunSelection";
import { fmtMoney } from "../campaignTrackerTypes";
import { NUMERIC, ReadoutStrip, TrackerLoading } from "./campaignTrackerPrimitives";
import { FilterLabel } from "./FilterControls";
import { BudgetPacingSheet } from "./BudgetPacingSheet";
import { RunPicker, RunsStatus } from "./BudgetSyncRunPicker";

export function BudgetSyncPacingPanel() {
  const { runsQ, run, detailQ, years, monthsForYear, selectRunFor } = useBudgetSyncRunSelection();
  const [dayEdit, setDayEdit] = useState<{ runId: string; day: number; draft: string } | null>(null);

  const detail = detailQ.data;
  const monthIndex = detail?.payload.month_index ?? run?.reviewed_month ?? 0;
  const budgetYear = run?.budget_year ?? new Date().getFullYear();

  const edit = dayEdit && dayEdit.runId === run?.id ? dayEdit : null;
  const day = edit?.day ?? defaultDay(budgetYear, monthIndex);
  const dayDraft = edit?.draft ?? String(day);

  const googleQ = usePacingLines("Google Ads", budgetYear, monthIndex, day, !!detail);
  const linkedinQ = usePacingLines("LinkedIn", budgetYear, monthIndex, day, !!detail);
  const pacingFetching = googleQ.isFetching || linkedinQ.isFetching;
  const pacingError = googleQ.error ?? linkedinQ.error;
  const pacingPlaceholder = googleQ.isPlaceholderData || linkedinQ.isPlaceholderData;
  const rawLines = useMemo(
    () => (googleQ.data && linkedinQ.data ? [...googleQ.data, ...linkedinQ.data] : null),
    [googleQ.data, linkedinQ.data],
  );

  if (runsQ.isPending || runsQ.error || !run) return <RunsStatus pending={runsQ.isPending} error={runsQ.error} />;

  const dim = daysInMonth(run.budget_year, monthIndex);
  const applyDay = () => {
    const v = parseInt(dayDraft, 10);
    if (Number.isFinite(v) && v >= 1 && v <= dim) setDayEdit({ runId: run.id, day: v, draft: String(v) });
    else setDayEdit({ runId: run.id, day, draft: String(day) }); // invalid entry — revert to the last applied value
  };

  return (
    <Box>
      <RunPicker run={run} years={years} monthsForYear={monthsForYear} onSelect={selectRunFor}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <FilterLabel>Day of {dim}</FilterLabel>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <TextField
              type="number"
              size="small"
              value={dayDraft}
              onChange={(e) => setDayEdit({ runId: run.id, day, draft: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyDay();
              }}
              inputProps={{ min: 1, max: dim, style: { textAlign: "center" } }}
              sx={{ width: 64, "& .MuiInputBase-input": { fontSize: "0.78rem", height: 20, ...NUMERIC } }}
            />
            <Button
              size="small"
              onClick={applyDay}
              disabled={dayDraft === String(day) || pacingFetching}
              startIcon={pacingFetching ? <CircularProgress size={12} sx={{ color: "inherit" }} /> : undefined}
              sx={{ textTransform: "none", fontSize: "0.72rem", fontWeight: 600, minWidth: 0, px: 1.25, height: 34 }}
            >
              {pacingFetching ? "Fetching…" : "Apply"}
            </Button>
          </Box>
        </Box>
      </RunPicker>

      {detailQ.error && (
        <Typography sx={{ fontSize: "0.76rem", color: "error.main", mb: 2 }}>{describeError(detailQ.error)}</Typography>
      )}
      {detailQ.isPending && !detailQ.error && <TrackerLoading messages={["Loading run…"]} />}

      {detail && (
        <>
          <ReadoutStrip
            items={[
              { label: `${detail.payload.month} total`, value: fmtMoney(Number(detail.total_month)) },
              { label: "Buffer", value: fmtMoney(Number(detail.total_month_buffer)) },
              // total_month is the grand total, buffer included — so total −
              // buffer is the non-buffer digital spend plan.
              { label: "Total − buffer", value: fmtMoney(Number(detail.total_month) - Number(detail.total_month_buffer)) },
            ]}
          />
          {rawLines && !pacingPlaceholder ? (
            // Keyed by run so the sheet's own filters reset when the run changes.
            <BudgetPacingSheet
              key={detail.id}
              cells={detail.payload.cells}
              monthIndex={monthIndex}
              budgetYear={detail.budget_year}
              day={day}
              rawLines={rawLines}
            />
          ) : pacingError ? (
            <Typography sx={{ fontSize: "0.76rem", color: "error.main", mt: 2 }}>{describeError(pacingError)}</Typography>
          ) : (
            <TrackerLoading messages={["Loading real ad spend…"]} />
          )}
        </>
      )}
    </Box>
  );
}
