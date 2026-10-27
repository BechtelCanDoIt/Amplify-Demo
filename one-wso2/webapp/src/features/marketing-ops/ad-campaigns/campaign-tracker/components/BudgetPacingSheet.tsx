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

// Budget Sync → Pacing sub-tab: the real pacing/forecasting view. Joins real ad
// spend (the run's month, via GET /pacing-lines) to the run's synced budget
// cells by (tab, region, bu) and shows a status board, pace verdicts, projected
// landing and delivery capacity, plus CSV/PDF report export. The math lives in
// budgetPacingLogic.ts (pure), the exports in budgetPacingExport.ts.
//
// Data and `day` are owned by BudgetSyncPacingPanel (its day control sits beside the
// Year/Month run pickers, and the pacing queries live there so its Apply
// button can show fetch progress). Every other filter below is local, and the
// panel keys this component by run id so they reset when the run changes.

import { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@wso2/oxygen-ui";
import { Download, FileText } from "@wso2/oxygen-ui-icons-react";
import type { PacingLine, SyncCell } from "../budgetSyncTypes";
import { fmtMoney } from "../campaignTrackerTypes";
import {
  BU_TABS,
  REGION_TABS,
  TABS,
  UTIL_BUCKETS,
  attributeLines,
  capacityNote,
  capacityTone,
  computeCapacity,
  computeIntegrity,
  computeSlice,
  crossValues,
  daysInMonth,
  gapTone,
  sortLines,
  spendAsOfLabel,
  sumSlices,
  utilBucket,
  utilOf,
  type AttributedLine,
  type IntegrityCheck,
  type LineSortKey,
  type Slice,
  type Verdict,
} from "../budgetPacingLogic";
import { downloadFullReportCsv, downloadLinesCsv, openReportWindow } from "../budgetPacingExport";
import { tint, useTonePalette, type TonePalette } from "../useBudgetSyncColors";
import { NUMERIC, ReadoutStrip, TintChip } from "./campaignTrackerPrimitives";
import { FilterLabel, MultiSelectFilter, RowCount } from "./FilterControls";

// Rendered rows cap for a drilldown list — defensive only (the $-figure these
// attach to is usually a handful of campaigns; this guards the pathological
// case of many small non-zero amounts instead of a few large ones).
const DRILLDOWN_MAX_ROWS = 100;

const BUTTON_SX = { textTransform: "none", fontSize: "0.72rem", fontWeight: 600, minWidth: 0 } as const;

function IntegrityDrilldown({ rows, palette }: { rows: { name: string; spend: number }[]; palette: TonePalette }) {
  const shown = rows.slice(0, DRILLDOWN_MAX_ROWS);
  return (
    <Box sx={{ mt: 0.5, mb: 0.5, ml: 2.25, border: 1, borderColor: tint(palette.red, 14), borderRadius: "6px", overflow: "hidden" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", py: 0.5 }}>Campaign</TableCell>
            <TableCell align="right" sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", py: 0.5 }}>
              MTD spend
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shown.map((r, i) => (
            <TableRow key={i}>
              <TableCell sx={{ fontSize: "0.7rem", py: 0.375 }}>{r.name}</TableCell>
              <TableCell align="right" sx={{ fontSize: "0.7rem", py: 0.375, ...NUMERIC }}>
                {fmtMoney(r.spend)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > DRILLDOWN_MAX_ROWS && (
        <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", px: 1, py: 0.5 }}>
          +{rows.length - DRILLDOWN_MAX_ROWS} more, smaller amounts each
        </Typography>
      )}
    </Box>
  );
}

function IntegrityPanel({ checks, palette }: { checks: IntegrityCheck[]; palette: TonePalette }) {
  const failing = checks.filter((c) => c.ok === false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Box sx={{ mt: 2 }}>
      {failing.length > 0 && (
        <Box
          sx={{
            p: 1.25,
            mb: 1.5,
            borderRadius: "8px",
            bgcolor: tint(palette.red, 6),
            border: 1,
            borderColor: tint(palette.red, 19),
          }}
        >
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "error.main" }}>
            Do not act on this — {failing.length} integrity check{failing.length > 1 ? "s" : ""} failed
          </Typography>
          {failing.map((c, i) => (
            <Typography key={i} sx={{ fontSize: "0.72rem", color: "error.main", mt: 0.25 }}>
              {c.title}
            </Typography>
          ))}
        </Box>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {checks.map((c, i) => (
          <Box key={i}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
              <Typography
                sx={{
                  fontSize: "0.74rem",
                  lineHeight: 1.4,
                  color: c.ok === false ? "error.main" : c.ok === true ? "success.main" : "text.disabled",
                }}
              >
                {c.ok === false ? "✗" : c.ok === true ? "✓" : "•"}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                <b style={{ color: "inherit" }}>{c.title}</b> — {c.detail}
                {c.drilldown && (
                  <>
                    {" — "}
                    <Box
                      component="button"
                      type="button"
                      onClick={() => toggle(i)}
                      sx={{
                        color: "error.main",
                        fontWeight: 700,
                        cursor: "pointer",
                        textDecoration: "underline",
                        background: "none",
                        border: 0,
                        p: 0,
                        font: "inherit",
                      }}
                    >
                      {expanded.has(i)
                        ? "hide campaigns"
                        : `show ${c.drilldown.length} campaign${c.drilldown.length > 1 ? "s" : ""}`}
                    </Box>
                  </>
                )}
              </Typography>
            </Box>
            {c.drilldown && expanded.has(i) && <IntegrityDrilldown rows={c.drilldown} palette={palette} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Sticky-bottom totals convention shared with BudgetSyncPanel's TotalsRow —
// pinned per-cell rather than on the <tr>, since sticky on a row itself isn't
// reliable; a solid background stops body rows bleeding through underneath.
const STICKY_TOTALS_CELL_SX = {
  position: "sticky" as const,
  bottom: 0,
  zIndex: 2,
  bgcolor: "background.paper",
  borderTop: "2px solid",
  borderTopColor: "text.primary",
};

function LineTableTotalsRow({ lines }: { lines: AttributedLine[] }) {
  const cap = lines.reduce((a, l) => a + Number(l.daily_budget ?? 0), 0);
  const spend = lines.reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0);
  const clicks = lines.reduce((a, l) => a + Number(l.clicks ?? 0), 0);
  return (
    <TableRow>
      <TableCell colSpan={6} sx={STICKY_TOTALS_CELL_SX}>
        <Typography sx={{ fontSize: "0.76rem", fontWeight: 700 }}>Total</Typography>
      </TableCell>
      <TableCell align="right" sx={STICKY_TOTALS_CELL_SX}>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, ...NUMERIC }}>{fmtMoney(cap)}</Typography>
      </TableCell>
      <TableCell sx={STICKY_TOTALS_CELL_SX} />
      <TableCell align="right" sx={STICKY_TOTALS_CELL_SX}>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 800, ...NUMERIC }}>{fmtMoney(spend)}</Typography>
      </TableCell>
      <TableCell align="right" sx={STICKY_TOTALS_CELL_SX}>
        <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, ...NUMERIC }}>{clicks}</Typography>
      </TableCell>
    </TableRow>
  );
}

function BurnBar({ pct, todayPct }: { pct: number; todayPct: number }) {
  return (
    <Box sx={{ position: "relative", width: 90, height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}>
      <Box
        sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, pct))}%`, bgcolor: "primary.main" }}
      />
      <Box
        sx={{
          position: "absolute",
          left: `${Math.min(100, Math.max(0, todayPct))}%`,
          top: -2,
          bottom: -2,
          width: "2px",
          bgcolor: "text.primary",
        }}
      />
    </Box>
  );
}

// `emphasize` marks a rollup row (BU total / Regional total / Account / a tab's
// own "<tab> total") — bold throughout, a subtle fill and a top border to
// separate it from the individual rows it sums.
function BoardRow({
  label,
  slice,
  day,
  dim,
  emphasize,
  palette,
}: {
  label: string;
  slice: Slice;
  day: number;
  dim: number;
  emphasize?: boolean;
  palette: TonePalette;
}) {
  const pct = slice.budget > 0 ? (slice.spend / slice.budget) * 100 : 0;
  const cellSx = emphasize ? { borderTop: "2px solid", borderTopColor: "text.primary", bgcolor: "action.hover" } : {};
  const fw = emphasize ? 800 : 400;
  const num = { fontSize: "0.74rem", fontWeight: fw, ...NUMERIC };
  return (
    <TableRow>
      <TableCell sx={cellSx}>
        <Typography sx={{ fontSize: "0.76rem", fontWeight: emphasize ? 800 : 600 }}>{label}</Typography>
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        <Typography sx={num}>{fmtMoney(slice.budget)}</Typography>
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        <Typography sx={num}>{fmtMoney(slice.spend)}</Typography>
      </TableCell>
      <TableCell sx={cellSx}>
        <BurnBar pct={pct} todayPct={(day / dim) * 100} />
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        <Typography sx={{ ...num, color: palette[slice.verdict.tone] }}>
          {slice.verdict.pace === null ? "—" : `${Math.round(slice.verdict.pace * 100)}%`}
        </Typography>
      </TableCell>
      <TableCell sx={cellSx}>
        <TintChip label={slice.verdict.label} color={palette[slice.verdict.tone]} />
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        <Typography sx={num}>{fmtMoney(slice.using)}</Typography>
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        <Typography sx={num}>{fmtMoney(slice.needs)}</Typography>
      </TableCell>
      <TableCell align="right" sx={cellSx}>
        <Typography sx={{ ...num, color: palette[gapTone(slice.budget, slice.gap)] }}>{fmtMoney(slice.gap)}</Typography>
      </TableCell>
    </TableRow>
  );
}

function BoardHead() {
  return (
    <TableHead>
      <TableRow>
        <TableCell>Budget line</TableCell>
        <TableCell align="right">Month budget</TableCell>
        <TableCell align="right">Spent</TableCell>
        <TableCell>Burn</TableCell>
        <TableCell align="right">Pace</TableCell>
        <TableCell>Status</TableCell>
        <TableCell align="right">Using/day</TableCell>
        <TableCell align="right">Needs/day</TableCell>
        <TableCell align="right">Still to spend</TableCell>
      </TableRow>
    </TableHead>
  );
}

// The single headline figure — "are we okay or not" — gets its own bordered,
// tinted card rather than sitting as just another label/value pair.
function PaceCard({ verdict, palette }: { verdict: Verdict; palette: TonePalette }) {
  const color = palette[verdict.tone];
  const pct = verdict.pace === null ? "—" : `${Math.round(verdict.pace * 100)}%`;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 0.5,
        px: 2.5,
        py: 1.5,
        minWidth: 140,
        borderRadius: "12px",
        border: "1.5px solid",
        borderColor: tint(color, 25),
        bgcolor: tint(color, 6),
      }}
    >
      <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "text.secondary" }}>
        Pace
      </Typography>
      <Typography sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1, color, ...NUMERIC }}>{pct}</Typography>
      <TintChip label={verdict.label} color={color} height={19} />
    </Box>
  );
}

function NavButton({
  label,
  active,
  color,
  onClick,
  small,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.6,
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        px: small ? 1 : 1.25,
        py: small ? 0.4 : 0.6,
        borderRadius: "999px",
        border: "1px solid",
        borderColor: active ? color : "divider",
        bgcolor: active ? tint(color, 6) : "transparent",
        transition: "all 0.12s ease",
        "&:hover": { borderColor: color },
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: small ? "0.68rem" : "0.74rem", fontWeight: active ? 700 : 500, color: active ? color : "text.primary" }}>
        {label}
      </Typography>
    </Box>
  );
}

const LINE_COLUMNS: [LineSortKey, string, "asc" | "desc", "right" | undefined][] = [
  ["campaign_name", "Campaign", "asc", undefined],
  ["status", "Status", "asc", undefined],
  ["platform", "Platform", "asc", undefined],
  ["side", "Owner", "asc", undefined],
  ["region", "Region", "asc", undefined],
  ["bu", "BU", "asc", undefined],
  ["daily_budget", "Cap/day", "desc", "right"],
  ["util", "Util%", "desc", "right"],
  ["mtd_spend", "Spend", "desc", "right"],
  ["clicks", "Clicks", "desc", "right"],
];

export function BudgetPacingSheet({
  cells,
  monthIndex,
  budgetYear,
  day,
  rawLines,
}: {
  cells: SyncCell[];
  monthIndex: number;
  budgetYear: number;
  day: number;
  rawLines: PacingLine[];
}) {
  const palette = useTonePalette();
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [selectedSub, setSelectedSub] = useState("all");
  const [search, setSearch] = useState("");
  const [showPaused, setShowPaused] = useState(false);
  const [utilFilter, setUtilFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<LineSortKey>("mtd_spend");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  const lines = attributeLines(rawLines);
  const dim = daysInMonth(budgetYear, monthIndex);

  const perTab = new Map(TABS.map((t) => [t.id, computeSlice(cells, lines, t.id, "all", monthIndex, day, dim)]));
  const buTotal = sumSlices(BU_TABS.map((t) => perTab.get(t.id)!), day, dim);
  const regionTotal = sumSlices(REGION_TABS.map((t) => perTab.get(t.id)!), day, dim);
  const accountSlice = computeSlice(cells, lines, "ALL", "all", monthIndex, day, dim);

  const activeSlice =
    selectedTab === "ALL" ? accountSlice : computeSlice(cells, lines, selectedTab, selectedSub, monthIndex, day, dim);
  const capacityRows = computeCapacity(activeSlice.lines, day);
  const integrity = computeIntegrity(cells, lines, monthIndex);

  const filteredLines = sortLines(
    activeSlice.lines
      .filter((l) => (showPaused ? true : l.live || Number(l.mtd_spend) > 0))
      .filter((l) => !utilFilter.length || utilFilter.includes(utilBucket(l, day)))
      .filter((l) => !search || l.campaign_name.toLowerCase().includes(search.toLowerCase())),
    sortKey,
    sortDir,
    day,
  );

  function toggleSort(key: LineSortKey, defaultDir: "asc" | "desc") {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(defaultDir);
    }
  }
  const sortArrow = (key: LineSortKey) => (sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "");
  const selectTab = (id: string) => {
    setSelectedTab(id);
    setSelectedSub("all");
  };

  const boardParams = { budgetYear, monthIndex, day, dim, buTabs: BU_TABS, regionTabs: REGION_TABS, perTab, buTotal, regionTotal, accountSlice };
  const openPdf = (includeLines: boolean) => {
    setPdfDialogOpen(false);
    openReportWindow({
      ...boardParams,
      cells,
      lines,
      selectedTab,
      selectedSub,
      activeSlice,
      capacityRows,
      integrity,
      filteredLines,
      includeLines,
      palette,
    });
  };

  return (
    <Box>
      {/* Nav: Overall + 13 tabs, dot color = that tab's own pace verdict */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
          <NavButton
            label="Overall"
            active={selectedTab === "ALL"}
            color={palette[accountSlice.verdict.tone]}
            onClick={() => selectTab("ALL")}
          />
        </Box>
        {([["BU budget", BU_TABS], ["Regional budget", REGION_TABS]] as const).map(([title, tabs]) => (
          <Box key={title} sx={{ mt: 1 }}>
            <FilterLabel>{title}</FilterLabel>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
              {tabs.map((t) => (
                <NavButton
                  key={t.id}
                  label={t.id}
                  active={selectedTab === t.id}
                  color={palette[perTab.get(t.id)!.verdict.tone]}
                  onClick={() => selectTab(t.id)}
                />
              ))}
            </Box>
          </Box>
        ))}
        {selectedTab !== "ALL" && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            <NavButton label="All" active={selectedSub === "all"} color={palette.slate} small onClick={() => setSelectedSub("all")} />
            {crossValues(cells, lines, selectedTab, monthIndex).map((v) => (
              <NavButton key={v} label={v} active={selectedSub === v} color={palette.slate} small onClick={() => setSelectedSub(v)} />
            ))}
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
          <Button
            size="small"
            startIcon={<Download size={15} />}
            onClick={() => downloadFullReportCsv({ ...boardParams, integrity, lines })}
            sx={BUTTON_SX}
          >
            Download full CSV report
          </Button>
          <Button size="small" startIcon={<FileText size={15} />} onClick={() => setPdfDialogOpen(true)} sx={BUTTON_SX}>
            Download as PDF
          </Button>
        </Box>
      </Box>

      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: "1rem" }}>Include campaign lines?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            The campaign lines table has {filteredLines.length} row{filteredLines.length === 1 ? "" : "s"} — the board, KPIs,
            delivery capacity, and integrity checks are included either way.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => openPdf(false)} sx={{ textTransform: "none", fontSize: "0.8rem", fontWeight: 600 }}>
            Without campaign lines
          </Button>
          <Button variant="contained" onClick={() => openPdf(true)} sx={{ textTransform: "none", fontSize: "0.8rem", fontWeight: 600 }}>
            With campaign lines
          </Button>
        </DialogActions>
      </Dialog>

      {/* KPI tiles for the current selection — Pace leads as its own hero card
          since it's the one figure that answers "are we okay or not" at a
          glance; everything else is supporting detail. */}
      <Box sx={{ mt: 2, display: "flex", alignItems: "stretch", gap: 2, flexWrap: "wrap" }}>
        <PaceCard verdict={activeSlice.verdict} palette={palette} />
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ReadoutStrip
            items={[
              { label: `${selectedTab === "ALL" ? "Account" : selectedTab} budget`, value: fmtMoney(activeSlice.budget) },
              { label: spendAsOfLabel(budgetYear, monthIndex, day), value: fmtMoney(activeSlice.spend) },
              { label: "Needs/day", value: fmtMoney(activeSlice.needs) },
              { label: "Using/day", value: fmtMoney(activeSlice.using) },
              {
                label: "Still to spend",
                value: fmtMoney(activeSlice.gap),
                color: palette[gapTone(activeSlice.budget, activeSlice.gap)],
              },
              ...(activeSlice.buffer > 0 ? [{ label: "Buffer held", value: fmtMoney(activeSlice.buffer) }] : []),
              { label: "Projected landing", value: fmtMoney(activeSlice.landing) },
            ]}
          />
        </Box>
      </Box>

      {/* Status board (Overall) or cross-table (a specific tab) */}
      <Box sx={{ mt: 2.5, border: 1, borderColor: "divider", borderRadius: "10px", overflow: "hidden" }}>
        <Box sx={{ overflow: "auto", maxHeight: 520 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
            <BoardHead />
            <TableBody>
              {selectedTab === "ALL" ? (
                <>
                  {BU_TABS.map((t) => (
                    <BoardRow key={t.id} label={t.id} slice={perTab.get(t.id)!} day={day} dim={dim} palette={palette} />
                  ))}
                  <BoardRow label="BU total" slice={buTotal} day={day} dim={dim} palette={palette} emphasize />
                  {REGION_TABS.map((t) => (
                    <BoardRow key={t.id} label={t.id} slice={perTab.get(t.id)!} day={day} dim={dim} palette={palette} />
                  ))}
                  <BoardRow label="Regional total" slice={regionTotal} day={day} dim={dim} palette={palette} emphasize />
                  <BoardRow label="Account" slice={accountSlice} day={day} dim={dim} palette={palette} emphasize />
                </>
              ) : (
                <>
                  {crossValues(cells, lines, selectedTab, monthIndex).map((v) => (
                    <BoardRow
                      key={v}
                      label={v}
                      slice={computeSlice(cells, lines, selectedTab, v, monthIndex, day, dim)}
                      day={day}
                      dim={dim}
                      palette={palette}
                    />
                  ))}
                  <BoardRow
                    label={`${selectedTab} total`}
                    slice={computeSlice(cells, lines, selectedTab, "all", monthIndex, day, dim)}
                    day={day}
                    dim={dim}
                    palette={palette}
                    emphasize
                  />
                </>
              )}
            </TableBody>
          </Table>
        </Box>
      </Box>

      {/* Delivery capacity / utilization by platform */}
      {capacityRows.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <FilterLabel>Delivery capacity</FilterLabel>
          <Box sx={{ display: "flex", gap: 1.5, mt: 0.75, flexWrap: "wrap" }}>
            {capacityRows.map((r) => {
              const color = palette[capacityTone(r.band)];
              return (
                <Box
                  key={r.platform}
                  sx={{ p: 1.25, borderRadius: "8px", border: 1, borderColor: tint(color, 19), bgcolor: tint(color, 3), minWidth: 180 }}
                >
                  <Typography sx={{ fontSize: "0.74rem", fontWeight: 700 }}>{r.platform}</Typography>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color, ...NUMERIC }}>
                    {r.utilization === null ? "—" : `${Math.round(r.utilization * 100)}%`}
                  </Typography>
                  <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>
                    {capacityNote(r.band)} · {r.n} live line(s)
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Campaign line table */}
      <Box sx={{ mt: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, mb: 1, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <FilterLabel>Search campaigns</FilterLabel>
            <TextField
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Campaign name…"
              sx={{ width: 260, "& .MuiInputBase-input": { fontSize: "0.76rem" } }}
            />
          </Box>
          <MultiSelectFilter label="Cap utilization" options={UTIL_BUCKETS} selected={utilFilter} onChange={setUtilFilter} width={190} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Checkbox size="small" checked={showPaused} onChange={(e) => setShowPaused(e.target.checked)} sx={{ p: 0.5 }} />
            <Typography sx={{ fontSize: "0.74rem" }}>Show paused / completed</Typography>
          </Box>
          <RowCount shown={filteredLines.length} total={activeSlice.lines.length} singular="campaign" />
          <Button
            size="small"
            startIcon={<Download size={15} />}
            onClick={() => downloadLinesCsv(filteredLines, `${budgetYear}-${monthIndex + 1}-day${day}-${selectedTab}`)}
            disabled={!filteredLines.length}
            sx={{ ...BUTTON_SX, ml: "auto" }}
          >
            Download CSV
          </Button>
        </Box>
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: "10px", overflow: "hidden" }}>
          <Box sx={{ overflow: "auto", maxHeight: 480 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  {LINE_COLUMNS.map(([key, label, defaultDir, align]) => (
                    <TableCell
                      key={key}
                      align={align}
                      onClick={() => toggleSort(key, defaultDir)}
                      sx={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", "&:hover": { color: "primary.main" } }}
                    >
                      {label}
                      {sortArrow(key)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLines.map((l) => {
                  const util = utilOf(l, day);
                  return (
                    <TableRow key={`${l.platform}:${l.id}`}>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.74rem", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.campaign_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: "0.72rem", color: l.live ? "success.main" : "text.secondary" }}>{l.status ?? "—"}</Typography>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: "0.74rem" }}>{l.platform}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: "0.74rem" }}>{l.side}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: "0.74rem" }}>{l.region}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: "0.74rem" }}>{l.bu}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: "0.74rem", ...NUMERIC }}>
                          {l.daily_budget != null ? fmtMoney(Number(l.daily_budget)) : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: "0.74rem",
                            ...NUMERIC,
                            color: util === null ? "text.disabled" : util > 0.95 ? "success.main" : "warning.main",
                          }}
                        >
                          {util === null ? "—" : `${Math.round(util * 100)}%`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: "0.74rem", fontWeight: 600, ...NUMERIC }}>{fmtMoney(Number(l.mtd_spend))}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: "0.74rem", ...NUMERIC }}>{l.clicks}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <LineTableTotalsRow lines={filteredLines} />
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 2.5 }}>
        <IntegrityPanel checks={integrity} palette={palette} />
      </Box>
    </Box>
  );
}
