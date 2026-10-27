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

// CSV and printable-PDF exports for the Budget Sync Pacing sub-tab. Everything
// is built from rows already in memory (the tables' own data), not a
// server-side export.

import type { SyncCell } from "./budgetSyncTypes";
import { fmtMoney } from "./campaignTrackerTypes";
import {
  capacityNote,
  capacityTone,
  computeSlice,
  crossValues,
  gapTone,
  spendAsOfLabel,
  type AttributedLine,
  type CapacityRow,
  type IntegrityCheck,
  type Slice,
} from "./budgetPacingLogic";
import { tint, type TonePalette } from "./useBudgetSyncColors";

// Includes the raw fields behind the table's rounded/formatted columns
// (status, live, daily_budget, mtd_spend, clicks) so a downloaded file is
// useful for debugging a figure that looks wrong, not just a copy of the screen.
const CSV_KEYS: (keyof AttributedLine)[] = [
  "id",
  "campaign_name",
  "platform",
  "status",
  "live",
  "side",
  "region",
  "bu",
  "tab",
  "daily_budget",
  "mtd_spend",
  "clicks",
];

function csvEsc(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Neutralize spreadsheet formulas in free-text cells (e.g. campaign names).
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvEsc).join(",");
}

function triggerCsvDownload(rows: string[], filename: string) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadLinesCsv(lines: AttributedLine[], label: string) {
  if (!lines.length) return;
  const rows = [csvRow(CSV_KEYS)];
  for (const l of lines) rows.push(csvRow(CSV_KEYS.map((k) => l[k])));
  triggerCsvDownload(rows, `budget-pacing-${label}.csv`);
}

interface BoardParams {
  budgetYear: number;
  monthIndex: number;
  day: number;
  dim: number;
  buTabs: { id: string }[];
  regionTabs: { id: string }[];
  perTab: Map<string, Slice>;
  buTotal: Slice;
  regionTotal: Slice;
  accountSlice: Slice;
}

// Everything for the whole account (every tab, not just the selected one —
// that scoping is what makes "Download CSV" a *view* export and this a
// *report*), as one CSV of blank-line-separated sections: the board, integrity
// checks, the unmapped-campaign drilldown, and every campaign line.
export function downloadFullReportCsv(
  params: BoardParams & { integrity: IntegrityCheck[]; lines: AttributedLine[] },
) {
  const { budgetYear, monthIndex, day, dim, buTabs, regionTabs, perTab, buTotal, regionTotal, accountSlice, integrity, lines } =
    params;
  const period = new Date(budgetYear, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const rows: string[] = [];

  rows.push(csvRow(["BUDGET PACING REPORT"]));
  rows.push(csvRow(["Period", period]));
  rows.push(csvRow(["As of day", `${day} of ${dim}`]));
  rows.push(csvRow(["Generated", new Date().toISOString()]));
  rows.push("");

  rows.push(csvRow(["BOARD"]));
  rows.push(
    csvRow(["Budget line", "Month budget", "Spent", "Pace", "Using/day", "Needs/day", "Still to spend", "Projected landing"]),
  );
  const boardRow = (label: string, s: Slice) =>
    rows.push(csvRow([label, s.budget, s.spend, s.verdict.label, s.using, s.needs, s.gap, s.landing]));
  for (const t of buTabs) boardRow(t.id, perTab.get(t.id)!);
  boardRow("BU total", buTotal);
  for (const t of regionTabs) boardRow(t.id, perTab.get(t.id)!);
  boardRow("Regional total", regionTotal);
  boardRow("Account", accountSlice);
  rows.push("");

  rows.push(csvRow(["INTEGRITY CHECKS"]));
  rows.push(csvRow(["Check", "Result", "Detail"]));
  for (const c of integrity) {
    rows.push(csvRow([c.title, c.ok === true ? "PASS" : c.ok === false ? "FAIL" : "INFO", c.detail]));
  }
  rows.push("");

  const unmapped = integrity.find((c) => c.drilldown)?.drilldown ?? [];
  if (unmapped.length > 0) {
    rows.push(csvRow(["UNMAPPED CAMPAIGNS (non-zero spend)"]));
    rows.push(csvRow(["Campaign", "MTD spend"]));
    for (const u of unmapped) rows.push(csvRow([u.name, u.spend]));
    rows.push("");
  }

  rows.push(csvRow(["ALL CAMPAIGN LINES"]));
  rows.push(csvRow(CSV_KEYS));
  for (const l of lines) rows.push(csvRow(CSV_KEYS.map((k) => l[k])));

  triggerCsvDownload(rows, `budget-pacing-full-report-${budgetYear}-${monthIndex + 1}-day${day}.csv`);
}

const reportHtmlEsc = (v: unknown): string =>
  String(v ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

// "Download as PDF" opens a separate browser window containing ONLY this
// report — a bare, self-contained HTML document, not a route inside this SPA —
// so the PDF never picks up the app's sidebar/nav chrome and nothing is clipped
// to the dashboard's fixed-height scroll boxes. window.print() is called on
// that window once loaded; choosing "Save as PDF" in the print dialog is the
// actual export.
export function openReportWindow(
  params: BoardParams & {
    cells: SyncCell[];
    lines: AttributedLine[];
    // Whatever's currently selected/filtered on screen — the report mirrors it
    // rather than always dumping the whole account.
    selectedTab: string;
    selectedSub: string;
    activeSlice: Slice;
    capacityRows: CapacityRow[];
    integrity: IntegrityCheck[];
    filteredLines: AttributedLine[];
    // The lines table can run well over a thousand rows — asked for explicitly
    // rather than always included.
    includeLines: boolean;
    palette: TonePalette;
  },
) {
  const {
    budgetYear, monthIndex, day, dim, cells, lines, buTabs, regionTabs, perTab, buTotal, regionTotal, accountSlice,
    selectedTab, selectedSub, activeSlice, capacityRows, integrity, filteredLines, includeLines, palette,
  } = params;
  const period = new Date(budgetYear, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const scopeLabel =
    selectedTab === "ALL" ? "Account" : selectedSub === "all" ? selectedTab : `${selectedTab} · ${selectedSub}`;

  // A burn bar per board row: a fill for spend/budget%, plus a vertical marker
  // at the elapsed-day fraction.
  const burnBarHtml = (s: Slice) => {
    const pct = Math.min(100, Math.max(0, s.budget > 0 ? (s.spend / s.budget) * 100 : 0));
    const todayPct = Math.min(100, Math.max(0, (day / dim) * 100));
    return `<div class="burn"><div class="burn-fill" style="width:${pct}%"></div><div class="burn-today" style="left:${todayPct}%"></div></div>`;
  };

  const boardRowHtml = (label: string, s: Slice, emphasize?: boolean) => `
    <tr${emphasize ? ' class="total"' : ""}>
      <td>${reportHtmlEsc(label)}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(s.budget))}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(s.spend))}</td>
      <td>${burnBarHtml(s)}</td>
      <td style="color:${palette[s.verdict.tone]}">${reportHtmlEsc(s.verdict.label)}${s.verdict.pace !== null ? ` (${Math.round(s.verdict.pace * 100)}%)` : ""}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(s.using))}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(s.needs))}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(s.gap))}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(s.landing))}</td>
    </tr>`;
  // Mirrors the live view: the full 13-tab board when "Overall" is selected,
  // or that one tab's own cross-table breakdown when a tab/sub-filter is active.
  const boardTitle = selectedTab === "ALL" ? "Status board" : `Status board — ${reportHtmlEsc(scopeLabel)}`;
  const boardRows =
    selectedTab === "ALL"
      ? [
          ...buTabs.map((t) => boardRowHtml(t.id, perTab.get(t.id)!)),
          boardRowHtml("BU total", buTotal, true),
          ...regionTabs.map((t) => boardRowHtml(t.id, perTab.get(t.id)!)),
          boardRowHtml("Regional total", regionTotal, true),
          boardRowHtml("Account", accountSlice, true),
        ].join("")
      : [
          ...crossValues(cells, lines, selectedTab, monthIndex).map((v) =>
            boardRowHtml(v, computeSlice(cells, lines, selectedTab, v, monthIndex, day, dim)),
          ),
          boardRowHtml(
            `${selectedTab} total`,
            computeSlice(cells, lines, selectedTab, "all", monthIndex, day, dim),
            true,
          ),
        ].join("");

  // KPI squares — same figures as the live view's readout, as bordered tiles,
  // scoped to whatever's currently selected (Account, or one tab/sub).
  const kpiTiles: { label: string; value: string; color?: string }[] = [
    { label: `${scopeLabel} budget`, value: fmtMoney(activeSlice.budget) },
    { label: spendAsOfLabel(budgetYear, monthIndex, day), value: fmtMoney(activeSlice.spend) },
    {
      label: "Pace",
      value:
        activeSlice.verdict.pace === null
          ? "—"
          : `${Math.round(activeSlice.verdict.pace * 100)}% · ${activeSlice.verdict.label}`,
      color: palette[activeSlice.verdict.tone],
    },
    { label: "Needs/day", value: fmtMoney(activeSlice.needs) },
    { label: "Using/day", value: fmtMoney(activeSlice.using) },
    {
      label: "Still to spend",
      value: fmtMoney(activeSlice.gap),
      color: palette[gapTone(activeSlice.budget, activeSlice.gap)],
    },
    ...(activeSlice.buffer > 0 ? [{ label: "Buffer held", value: fmtMoney(activeSlice.buffer) }] : []),
    { label: "Projected landing", value: fmtMoney(activeSlice.landing) },
  ];
  const kpiHtml = kpiTiles
    .map(
      (k) => `
    <div class="kpi">
      <div class="kpi-label">${reportHtmlEsc(k.label)}</div>
      <div class="kpi-value"${k.color ? ` style="color:${k.color}"` : ""}>${reportHtmlEsc(k.value)}</div>
    </div>`,
    )
    .join("");

  // Delivery capacity as colored cards (matching the live view's band colors).
  const capacityHtml = capacityRows
    .map((r) => {
      const color = palette[capacityTone(r.band)];
      return `
      <div class="cap-card" style="border-color:${tint(color, 30)};background:${tint(color, 7)}">
        <div class="cap-platform">${reportHtmlEsc(r.platform)}</div>
        <div class="cap-util" style="color:${color}">${r.utilization === null ? "—" : `${Math.round(r.utilization * 100)}%`}</div>
        <div class="cap-note">${reportHtmlEsc(capacityNote(r.band))} · ${r.n} live line(s)</div>
      </div>`;
    })
    .join("");

  // Integrity checks sit at the very bottom, and a check with a drilldown
  // lists the actual unmapped campaigns and their spend, not just a count.
  const integrityHtml = integrity
    .map(
      (c) => `
    <li class="${c.ok === false ? "fail" : c.ok === true ? "pass" : "info"}">
      <b>${c.ok === false ? "✗" : c.ok === true ? "✓" : "•"} ${reportHtmlEsc(c.title)}</b> — ${reportHtmlEsc(c.detail)}
      ${
        c.drilldown && c.drilldown.length > 0
          ? `
        <table class="drilldown">
          <thead><tr><th>Unmapped campaign</th><th class="n">MTD spend</th></tr></thead>
          <tbody>
            ${c.drilldown.map((d) => `<tr><td>${reportHtmlEsc(d.name)}</td><td class="n">${reportHtmlEsc(fmtMoney(d.spend))}</td></tr>`).join("")}
          </tbody>
        </table>`
          : ""
      }
    </li>`,
    )
    .join("");

  // filteredLines already reflects the on-screen search/util-cap/show-paused
  // filters and column sort — this is what "use current filters" means here.
  const lineRows = filteredLines
    .map(
      (l) => `
    <tr>
      <td>${reportHtmlEsc(l.campaign_name)}</td>
      <td>${reportHtmlEsc(l.status)}</td>
      <td>${reportHtmlEsc(l.platform)}</td>
      <td>${reportHtmlEsc(l.side)}</td>
      <td>${reportHtmlEsc(l.region)}</td>
      <td>${reportHtmlEsc(l.bu)}</td>
      <td class="n">${l.daily_budget != null ? reportHtmlEsc(fmtMoney(Number(l.daily_budget))) : "—"}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(Number(l.mtd_spend)))}</td>
      <td class="n">${reportHtmlEsc(l.clicks)}</td>
    </tr>`,
    )
    .join("");
  const lineTotals = {
    cap: filteredLines.reduce((a, l) => a + Number(l.daily_budget ?? 0), 0),
    spend: filteredLines.reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0),
    clicks: filteredLines.reduce((a, l) => a + Number(l.clicks ?? 0), 0),
  };
  const lineTotalsRow = `
    <tr class="total">
      <td colspan="6">Total</td>
      <td class="n">${reportHtmlEsc(fmtMoney(lineTotals.cap))}</td>
      <td class="n">${reportHtmlEsc(fmtMoney(lineTotals.spend))}</td>
      <td class="n">${reportHtmlEsc(lineTotals.clicks)}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Budget Pacing Report — ${reportHtmlEsc(period)}</title>
<style>
  /* Browsers skip background colors/images when printing unless told
     otherwise — without this, the burn bars, capacity cards and totals-row
     shading render on screen but come out blank in the actual PDF. */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 28px 0 8px; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; }
  .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: middle; }
  th { background: #f2f2f2; }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 700; background: #f7f7f7; border-top: 2px solid #1a1a1a; }

  .kpi-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
  .kpi { border: 1px solid #ccc; border-radius: 8px; padding: 10px 14px; min-width: 130px; flex: 1 1 130px; }
  .kpi-label { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #666; }
  .kpi-value { font-size: 16px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }

  .burn { position: relative; width: 90px; height: 7px; border-radius: 4px; background: #eee; overflow: hidden; }
  .burn-fill { position: absolute; left: 0; top: 0; bottom: 0; background: ${palette.orange}; }
  .burn-today { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #1a1a1a; }

  .cap-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
  .cap-card { border: 1px solid; border-radius: 8px; padding: 10px 14px; min-width: 170px; }
  .cap-platform { font-size: 11px; font-weight: 700; }
  .cap-util { font-size: 18px; font-weight: 800; margin: 2px 0; }
  .cap-note { font-size: 10px; color: #555; }

  table.drilldown { margin: 4px 0 8px 22px; width: calc(100% - 22px); font-size: 10px; }
  table.drilldown th, table.drilldown td { padding: 3px 6px; }

  ul.integrity { list-style: none; padding: 0; font-size: 12px; }
  ul.integrity li { padding: 4px 0; }
  ul.integrity li.fail { color: #b3261e; }
  ul.integrity li.pass { color: #146c2e; }
  ul.integrity li.info { color: #666; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } tr, .kpi, .cap-card { break-inside: avoid; } }
</style>
</head>
<body>
  <h1>Budget Pacing Report — ${reportHtmlEsc(scopeLabel)}</h1>
  <div class="meta">${reportHtmlEsc(period)} · as of day ${day} of ${dim} · generated ${reportHtmlEsc(new Date().toLocaleString())}</div>

  <div class="kpi-row">${kpiHtml}</div>

  <h2>${boardTitle}</h2>
  <table>
    <thead><tr><th>Budget line</th><th class="n">Month budget</th><th class="n">Spent</th><th>Burn</th><th>Pace</th><th class="n">Using/day</th><th class="n">Needs/day</th><th class="n">Still to spend</th><th class="n">Projected landing</th></tr></thead>
    <tbody>${boardRows}</tbody>
  </table>

  <h2>Delivery capacity</h2>
  <div class="cap-row">${capacityHtml || '<div class="cap-note">No live capacity data for this view.</div>'}</div>

  ${
    includeLines
      ? `
  <h2>Campaign lines (${filteredLines.length})</h2>
  <table>
    <thead><tr><th>Campaign</th><th>Status</th><th>Platform</th><th>Owner</th><th>Region</th><th>BU</th><th class="n">Cap/day</th><th class="n">Spend</th><th class="n">Clicks</th></tr></thead>
    <tbody>${lineRows}${lineTotalsRow}</tbody>
  </table>`
      : ""
  }

  <h2>Integrity checks</h2>
  <ul class="integrity">${integrityHtml}</ul>
</body>
</html>`;

  // A real (blob:) URL rather than document.write() on a blank popup — the
  // print header/footer shows the page's actual location, and an untouched
  // window.open('') window reads literally "about:blank". Browsers offer no
  // page-level way to override that text; turning off "Headers and footers" in
  // the print dialog removes the corner entirely.
  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(blobUrl, "_blank");
  if (!win) {
    URL.revokeObjectURL(blobUrl); // popup blocked — nothing to fall back to silently
    return;
  }
  win.onload = () => {
    win.print();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  };
}
