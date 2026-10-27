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

// Budget Sync: a read-only inspector for the Google Sheets budget connector
// add-on's synced runs — the plan side only: what was allocated (cells), which
// tabs contributed it (sources), and what got left out of the reviewed month
// and why (exclusions). Every sync is an immutable, append-only run, so the run
// picker below is a plain history list, not a "current state" toggle.
//
// How real spend is tracking against this plan is the separate Pacing tab
// (BudgetSyncPacingPanel.tsx); both pick a run via useBudgetSyncRunSelection.
//
// Owns its own data like BuOwnersPanel (no props).

import { Fragment, useState } from "react";
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, IconButton } from "@wso2/oxygen-ui";
import { ChevronDown, ChevronRight } from "@wso2/oxygen-ui-icons-react";
import { describeError } from "@api/errors";
import type { SyncAudit, SyncCell, SyncSource } from "../budgetSyncTypes";
import { fmtMoney } from "../campaignTrackerTypes";
import { useBudgetSyncRunSelection } from "../useBudgetSyncRunSelection";
import { tint, useTonePalette, type TonePalette } from "../useBudgetSyncColors";
import { NUMERIC, ReadoutStrip, TintChip, TrackerLoading } from "./campaignTrackerPrimitives";
import { RowCount } from "./FilterControls";
import { RunPicker, RunsStatus } from "./BudgetSyncRunPicker";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sumAmounts = (amounts: number[]): number => amounts.reduce((a, b) => a + Number(b ?? 0), 0);

// Every cell/source carries the full year (a sync is always a full-year
// snapshot — `month_index` on the run only records which month was reviewed,
// not what was sent), so the month columns show all twelve rather than just the
// one that was reviewed. The reviewed month is highlighted, not the only thing
// shown.
function MonthHeaderCells({ monthIndex }: { monthIndex: number }) {
  return (
    <>
      {MONTH_ABBR.map((m, i) => (
        <TableCell
          key={m}
          align="right"
          sx={{ color: i === monthIndex ? "primary.main" : undefined, fontWeight: i === monthIndex ? 800 : undefined }}
        >
          {m}
        </TableCell>
      ))}
    </>
  );
}

function MonthAmountCells({ amounts, monthIndex, palette }: { amounts: number[]; monthIndex: number; palette: TonePalette }) {
  return (
    <>
      {MONTH_ABBR.map((_, i) => (
        <TableCell key={i} align="right" sx={{ bgcolor: i === monthIndex ? tint(palette.orange, 6) : undefined }}>
          <Typography
            sx={{
              fontSize: "0.74rem",
              ...NUMERIC,
              fontWeight: i === monthIndex ? 700 : 400,
              color: i === monthIndex ? "primary.main" : "text.primary",
            }}
          >
            {fmtMoney(Number(amounts[i] ?? 0))}
          </Typography>
        </TableCell>
      ))}
    </>
  );
}

const monthSums = (rows: number[][]): number[] => {
  const sums = new Array<number>(12).fill(0);
  for (const amounts of rows) for (let i = 0; i < 12; i++) sums[i] += Number(amounts[i] ?? 0);
  return sums;
};

// Bottom "Total" row for a Cells/Sources table — per-month sums across every
// row shown (buffer rows included: a raw column total, not a pacing figure).
// Pinned to the bottom of the scrollable area (mirroring `stickyHeader` pinning
// the header to the top); each cell gets its own `position: sticky` since sticky
// on <tr> itself isn't reliable, with a solid background so body rows don't
// bleed through as they scroll underneath.
const STICKY_TOTALS_CELL_SX = {
  position: "sticky" as const,
  bottom: 0,
  zIndex: 2,
  bgcolor: "background.paper",
  borderTop: "2px solid",
  borderTopColor: "text.primary",
};

function TotalsRow({
  label,
  labelColSpan,
  perMonth,
  monthIndex,
}: {
  label: string;
  labelColSpan: number;
  perMonth: number[];
  monthIndex: number;
}) {
  return (
    <TableRow>
      <TableCell colSpan={labelColSpan} sx={STICKY_TOTALS_CELL_SX}>
        <Typography sx={{ fontSize: "0.76rem", fontWeight: 700 }}>{label}</Typography>
      </TableCell>
      {perMonth.map((v, i) => (
        <TableCell key={i} align="right" sx={STICKY_TOTALS_CELL_SX}>
          <Typography
            sx={{ fontSize: "0.74rem", fontWeight: 700, ...NUMERIC, color: i === monthIndex ? "primary.main" : "text.primary" }}
          >
            {fmtMoney(v)}
          </Typography>
        </TableCell>
      ))}
      <TableCell align="right" sx={STICKY_TOTALS_CELL_SX}>
        <Typography sx={{ fontSize: "0.76rem", fontWeight: 800, ...NUMERIC }}>{fmtMoney(sumAmounts(perMonth))}</Typography>
      </TableCell>
    </TableRow>
  );
}

// The synced plan itself, for auditing: what was allocated (Cells), which tabs
// contributed it (Sources), and what was left out and why (Exclusions). How
// spend is tracking against it is the Pacing tab.
type InnerTab = "Cells" | "Sources" | "Exclusions";
const INNER_TABS: InnerTab[] = ["Cells", "Sources", "Exclusions"];

// manual-flip (a human override, via the connector's session-only flip list)
// gets its own color; every rule-based reason ('excluded', 'no-include-token',
// 'always-include', …) falls back to the same neutral slate — the set is open.
const reasonColor = (reason: string, palette: TonePalette) => (reason === "manual-flip" ? palette.orange : palette.slate);

export function BudgetSyncPanel() {
  const palette = useTonePalette();
  const { runsQ, run, detailQ, years, monthsForYear, selectRunFor } = useBudgetSyncRunSelection();
  const [innerTab, setInnerTab] = useState<InnerTab>("Cells");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const detail = detailQ.data;
  const monthIndex = detail?.payload.month_index ?? run?.reviewed_month ?? 0;

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (runsQ.isPending || runsQ.error || !run) return <RunsStatus pending={runsQ.isPending} error={runsQ.error} />;

  return (
    <Box>
      <RunPicker run={run} years={years} monthsForYear={monthsForYear} onSelect={selectRunFor} />

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
              // buffer is the non-buffer digital spend plan, not a duplicate of
              // either figure above.
              { label: "Total − buffer", value: fmtMoney(Number(detail.total_month) - Number(detail.total_month_buffer)) },
            ]}
          />

          <Box
            role="tablist"
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 2.5, mb: 2, borderBottom: "1px solid", borderColor: "divider" }}
          >
            {INNER_TABS.map((label) => {
              const active = innerTab === label;
              return (
                <Box
                  key={label}
                  component="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setInnerTab(label)}
                  sx={{
                    px: 1.75,
                    py: 1,
                    fontSize: "0.8rem",
                    fontWeight: active ? 700 : 500,
                    fontFamily: "inherit",
                    bgcolor: "transparent",
                    border: 0,
                    color: active ? "primary.main" : "text.secondary",
                    cursor: "pointer",
                    position: "relative",
                    transition: "color 0.12s ease",
                    "&:hover": { color: active ? "primary.main" : "text.primary" },
                    "&::after": active
                      ? {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: -1,
                          height: 3,
                          borderRadius: "2px 2px 0 0",
                          bgcolor: "primary.main",
                        }
                      : {},
                  }}
                >
                  {label}
                </Box>
              );
            })}
          </Box>

          {innerTab === "Cells" && <CellsTable cells={detail.payload.cells} monthIndex={monthIndex} palette={palette} />}
          {innerTab === "Sources" && <SourcesTable sources={detail.payload.sources} monthIndex={monthIndex} palette={palette} />}
          {innerTab === "Exclusions" && (
            <ExclusionsTable audit={detail.payload.audit} collapsedIds={collapsedIds} onToggle={toggleCollapsed} palette={palette} />
          )}

          {/* Sync-level warnings (from the connector's own ingest validation,
              e.g. a source tab that legitimately kept 0 rows), at the bottom,
              out of the way of the header stats and run picker above. */}
          {(detail.warnings.length > 0 || detail.missing_sheets.length > 0) && (
            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              {detail.warnings.map((w, i) => (
                <Typography key={i} sx={{ fontSize: "0.74rem", color: "warning.main" }}>
                  {w.code}: {w.message}
                </Typography>
              ))}
              {detail.missing_sheets.length > 0 && (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.5 }}>
                  {detail.missing_sheets.map((s) => (
                    <TintChip key={s} label={`Missing: ${s}`} color={palette.amber} />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

const TABLE_FRAME_SX = { border: 1, borderColor: "divider", borderRadius: "10px", overflow: "hidden" } as const;
const cellText = { fontSize: "0.74rem" } as const;

function CellsTable({ cells, monthIndex, palette }: { cells: SyncCell[]; monthIndex: number; palette: TonePalette }) {
  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <RowCount shown={cells.length} total={cells.length} singular="cell" />
      </Box>
      <Box sx={TABLE_FRAME_SX}>
        <Box sx={{ overflow: "auto", maxHeight: 480 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unit</TableCell>
                <TableCell>Tab</TableCell>
                <TableCell>Side</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>BU</TableCell>
                <TableCell sx={{ width: 70 }} />
                <MonthHeaderCells monthIndex={monthIndex} />
                <TableCell align="right">Year total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cells.map((c, i) => (
                <TableRow key={i}>
                  <TableCell><Typography sx={cellText}>{c.unit}</Typography></TableCell>
                  <TableCell><Typography sx={cellText}>{c.tab_label}</Typography></TableCell>
                  <TableCell><Typography sx={cellText}>{c.side}</Typography></TableCell>
                  <TableCell><Typography sx={cellText}>{c.region}</Typography></TableCell>
                  <TableCell><Typography sx={cellText}>{c.bu}</Typography></TableCell>
                  <TableCell>{c.is_buffer && <TintChip label="Buffer" color={palette.slate} height={17} />}</TableCell>
                  <MonthAmountCells amounts={c.amounts} monthIndex={monthIndex} palette={palette} />
                  <TableCell align="right">
                    <Typography sx={{ ...cellText, fontWeight: 600, ...NUMERIC }}>{fmtMoney(sumAmounts(c.amounts))}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              <TotalsRow label="Total" labelColSpan={6} perMonth={monthSums(cells.map((c) => c.amounts))} monthIndex={monthIndex} />
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}

function SourcesTable({ sources, monthIndex, palette }: { sources: SyncSource[]; monthIndex: number; palette: TonePalette }) {
  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <RowCount shown={sources.length} total={sources.length} singular="source tab" />
      </Box>
      <Box sx={TABLE_FRAME_SX}>
        <Box sx={{ overflow: "auto", maxHeight: 480 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1420 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unit</TableCell>
                <TableCell>Tab</TableCell>
                <TableCell>Sheet tab</TableCell>
                <TableCell align="right">Kept rows</TableCell>
                <MonthHeaderCells monthIndex={monthIndex} />
                <TableCell align="right">Year total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.map((s, i) => (
                <TableRow key={i}>
                  <TableCell><Typography sx={cellText}>{s.unit}</Typography></TableCell>
                  <TableCell><Typography sx={cellText}>{s.sheet}</Typography></TableCell>
                  <TableCell><Typography sx={{ ...cellText, color: "text.secondary" }}>{s.sheet_tab}</Typography></TableCell>
                  <TableCell align="right"><Typography sx={cellText}>{s.kept_rows}</Typography></TableCell>
                  <MonthAmountCells amounts={s.amounts} monthIndex={monthIndex} palette={palette} />
                  <TableCell align="right">
                    <Typography sx={{ ...cellText, fontWeight: 600, ...NUMERIC }}>{fmtMoney(sumAmounts(s.amounts))}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              <TotalsRow label="Total" labelColSpan={4} perMonth={monthSums(sources.map((s) => s.amounts))} monthIndex={monthIndex} />
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}

function ExclusionsTable({
  audit,
  collapsedIds,
  onToggle,
  palette,
}: {
  audit: SyncAudit[];
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  palette: TonePalette;
}) {
  const groups = audit.flatMap((a) => a.entries.map((entry) => ({ key: `${a.unit}:${entry.sheet}`, unit: a.unit, entry })));

  if (!groups.length) {
    return (
      <Typography sx={{ fontSize: "0.76rem", color: "text.disabled", textAlign: "center", py: 3 }}>
        No exclusions recorded for this run
      </Typography>
    );
  }

  return (
    <Box sx={TABLE_FRAME_SX}>
      <Box sx={{ overflow: "auto", maxHeight: 480 }}>
        <Table size="small" stickyHeader sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36 }} />
              <TableCell>Unit</TableCell>
              <TableCell>Sheet</TableCell>
              <TableCell align="right">Claimed</TableCell>
              <TableCell align="right">Included</TableCell>
              <TableCell align="right">Excluded</TableCell>
              <TableCell align="right">Excluded $</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(({ key, unit, entry }) => {
              const collapsed = collapsedIds.has(key);
              return (
                <Fragment key={key}>
                  <TableRow onClick={() => onToggle(key)} sx={{ cursor: "pointer" }}>
                    <TableCell sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.25 }} aria-label={collapsed ? "Expand" : "Collapse"}>
                        {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </IconButton>
                    </TableCell>
                    <TableCell><Typography sx={cellText}>{unit}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: "0.76rem", fontWeight: 600 }}>{entry.sheet}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={cellText}>{entry.claimed_rows}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={cellText}>{entry.included}</Typography></TableCell>
                    <TableCell align="right"><Typography sx={cellText}>{entry.excluded}</Typography></TableCell>
                    <TableCell align="right">
                      <Typography sx={{ ...cellText, ...NUMERIC }}>{fmtMoney(Number(entry.excluded_amount))}</Typography>
                    </TableCell>
                  </TableRow>
                  {!collapsed &&
                    entry.excluded_list.map((ex, i) => (
                      <TableRow key={i} sx={{ bgcolor: "action.hover" }}>
                        <TableCell />
                        <TableCell colSpan={5}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 1 }}>
                            <TintChip label={ex.reason} color={reasonColor(ex.reason, palette)} height={17} />
                            <Typography sx={{ ...cellText, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ex.detail}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ ...cellText, ...NUMERIC }}>{fmtMoney(Number(ex.amount))}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
