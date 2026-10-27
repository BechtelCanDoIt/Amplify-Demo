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

// The pacing/forecasting engine behind Budget Sync's Pacing sub-tab: slice(),
// judge(), capacity(), crossTable() and integrity() over real synced Budget
// Sync cells (a run's `payload.cells`) and real ad spend (GET /pacing-lines — deliberately
// unfiltered by status, unlike the Budget Pacing tab's Active-only read).
//
// Pure functions only: no React, no theme. Verdicts carry a semantic `tone`
// rather than a color, resolved at render time (see useBudgetSyncColors.ts).
//
// Attribution (joining a real campaign to a budget cell's tab_label/side/
// region/bu) is pacingAttribution.ts's parser. A campaign whose name doesn't
// parse to a recognized code attributes to tab:'Unmapped' and is excluded from
// every tab bucket and the Account grand total, surfaced only via the
// integrity checklist (a hard failure only if it carries spend).
//
// Buffer cells (is_buffer) count toward a tab's displayed budget total but are
// excluded from every pacing computation (pace verdict, needs/day, gap) — a
// buffer/reserve line isn't something day-to-day spend paces against.

import type { PacingLine, SyncCell } from "./budgetSyncTypes";
import { fmtMoney } from "./campaignTrackerTypes";
import { attributeCampaignName, type CampaignAttribution } from "./pacingAttribution";
import type { Tone } from "./useBudgetSyncColors";

// The 13 budget tabs, matching the budget connector's owner-to-tab
// rule exactly — six BU-side tabs, seven Regional-side tabs.
export const TABS: { id: string; grp: "BU" | "Region" }[] = [
  { id: "API", grp: "BU" },
  { id: "Integration", grp: "BU" },
  { id: "IAM", grp: "BU" },
  { id: "AI", grp: "BU" },
  { id: "Solutions", grp: "BU" },
  { id: "Corporate", grp: "BU" },
  { id: "APAC", grp: "Region" },
  { id: "LATAM", grp: "Region" },
  { id: "NA", grp: "Region" },
  { id: "ME", grp: "Region" },
  { id: "Africa", grp: "Region" },
  { id: "EU", grp: "Region" },
  { id: "UK", grp: "Region" },
];
export const BU_TABS = TABS.filter((t) => t.grp === "BU");
export const REGION_TABS = TABS.filter((t) => t.grp === "Region");
const KNOWN_TAB_IDS = new Set(TABS.map((t) => t.id));
// A BU-side tab breaks down by region, a Regional-side tab by BU.
const crossOf = (tabId: string): "bu" | "region" =>
  TABS.find((t) => t.id === tabId)?.grp === "Region" ? "bu" : "region";

export interface AttributedLine extends PacingLine, CampaignAttribution {}

export function attributeLines(lines: PacingLine[]): AttributedLine[] {
  return lines.map((l) => ({ ...l, ...attributeCampaignName(l.campaign_name) }));
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Today's day-of-month when reviewing the current month, else the month's last day. */
export function defaultDay(year: number, monthIndex: number): number {
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() === monthIndex) return now.getDate();
  return daysInMonth(year, monthIndex);
}

// `mtd_spend` is a real re-query through `day`, so the label names the exact
// date it reflects — real vendor data for that day, not today's.
export function spendAsOfLabel(year: number, monthIndex: number, day: number): string {
  const asOf = new Date(year, monthIndex, day);
  return `Spent to date (as of ${asOf.toLocaleDateString(undefined, { month: "short", day: "numeric" })})`;
}

// Utilization is derived (spend/day ÷ daily cap), not a stored field — computed
// once here so the line table's render and its column sort agree on the number.
export function utilOf(l: AttributedLine, day: number): number | null {
  return l.live && l.daily_budget && day > 0 ? Number(l.mtd_spend) / day / Number(l.daily_budget) : null;
}

// Same >95% threshold the capacity panel colors by — lets a marketer isolate
// which live campaigns spend near/at their daily cap (raising it would let them
// spend more) vs. which don't (something else is limiting delivery).
export const UTIL_BUCKETS = [
  "Near/at cap (>95%) — raise cap to spend more",
  "Under cap (≤95%)",
  "No cap / not live",
] as const;

export function utilBucket(l: AttributedLine, day: number): (typeof UTIL_BUCKETS)[number] {
  const u = utilOf(l, day);
  if (u === null) return "No cap / not live";
  return u > 0.95 ? UTIL_BUCKETS[0] : UTIL_BUCKETS[1];
}

export type LineSortKey =
  | "campaign_name"
  | "status"
  | "platform"
  | "side"
  | "region"
  | "bu"
  | "daily_budget"
  | "util"
  | "mtd_spend"
  | "clicks";

export function sortLines(
  lines: AttributedLine[],
  key: LineSortKey,
  dir: "asc" | "desc",
  day: number,
): AttributedLine[] {
  const sign = dir === "asc" ? 1 : -1;
  const valueOf = (l: AttributedLine): string | number => {
    switch (key) {
      case "campaign_name":
        return l.campaign_name ?? "";
      case "status":
        return l.status ?? "";
      case "platform":
        return l.platform;
      case "side":
        return l.side;
      case "region":
        return l.region;
      case "bu":
        return l.bu;
      case "daily_budget":
        return Number(l.daily_budget ?? 0);
      case "util":
        return utilOf(l, day) ?? -Infinity;
      case "mtd_spend":
        return Number(l.mtd_spend ?? 0);
      case "clicks":
        return Number(l.clicks ?? 0);
    }
  };
  return [...lines].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    return typeof va === "string" && typeof vb === "string"
      ? sign * va.localeCompare(vb)
      : sign * ((va as number) - (vb as number));
  });
}

export interface Verdict {
  key: string;
  tone: Tone;
  label: string;
  pace: number | null;
}

// Pace ratio is spend vs. a PRO-RATA (elapsed-fraction) budget — deliberately
// different from "still to spend", which compares against the FULL month's
// budget. The two can disagree (green pace, amber gap) early in a month; that's
// intentional, not a bug.
export function judge(budget: number, spend: number, buffer: number, day: number, dim: number): Verdict {
  if (budget <= 0 && spend <= 0) {
    return { key: "none", tone: "slate", label: buffer > 0 ? "Buffer only, not paced" : "No activity", pace: null };
  }
  if (budget <= 0) {
    return {
      key: "nb",
      tone: "purple",
      label: buffer > 0 ? "Spending against buffer only" : "Spending with no budget",
      pace: null,
    };
  }
  const p = spend / ((budget * day) / dim);
  if (p < 0.9) return { key: "behind", tone: "amber", label: "Behind", pace: p };
  if (p > 1.1) return { key: "ahead", tone: "purple", label: "Ahead", pace: p };
  return { key: "ok", tone: "green", label: "On track", pace: p };
}

export function gapTone(budget: number, gap: number): Tone {
  if (budget <= 0) return "purple";
  if (gap > 0) return "amber";
  if (gap < 0) return "purple";
  return "green";
}

export interface Slice {
  budget: number;
  buffer: number;
  spend: number;
  cap: number;
  using: number;
  needs: number;
  gap: number;
  landing: number;
  verdict: Verdict;
  cells: SyncCell[];
  lines: AttributedLine[];
}

function buildSlice(
  budget: number,
  buffer: number,
  spend: number,
  cap: number,
  day: number,
  dim: number,
  cells: SyncCell[],
  lines: AttributedLine[],
): Slice {
  const remaining = Math.max(0, dim - day);
  const using = day > 0 ? spend / day : 0;
  const needs = remaining > 0 ? Math.max(0, (budget - spend) / remaining) : 0;
  return {
    budget,
    buffer,
    spend,
    cap,
    using,
    needs,
    gap: budget - spend,
    landing: spend + using * remaining,
    verdict: judge(budget, spend, buffer, day, dim),
    cells,
    lines,
  };
}

export function computeSlice(
  cells: SyncCell[],
  lines: AttributedLine[],
  tab: string,
  sub: string,
  monthIndex: number,
  day: number,
  dim: number,
): Slice {
  const cf = tab === "ALL" ? null : crossOf(tab);
  const bc = cells.filter(
    (c) =>
      (tab === "ALL" ? KNOWN_TAB_IDS.has(c.tab_label) : c.tab_label === tab) &&
      (!cf || sub === "all" || c[cf] === sub),
  );
  const ln = lines.filter(
    (l) =>
      (tab === "ALL" ? KNOWN_TAB_IDS.has(l.tab) : l.tab === tab) && (!cf || sub === "all" || l[cf] === sub),
  );
  const budget = bc.filter((c) => !c.is_buffer).reduce((a, c) => a + Number(c.amounts[monthIndex] ?? 0), 0);
  const buffer = bc.filter((c) => c.is_buffer).reduce((a, c) => a + Number(c.amounts[monthIndex] ?? 0), 0);
  const spend = ln.reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0);
  const cap = ln.filter((l) => l.live).reduce((a, l) => a + Number(l.daily_budget ?? 0), 0);
  return buildSlice(budget, buffer, spend, cap, day, dim, bc, ln);
}

/** BU/Region totals: sum the per-tab slices instead of re-filtering — one source of truth per tab. */
export function sumSlices(parts: Slice[], day: number, dim: number): Slice {
  return buildSlice(
    parts.reduce((a, s) => a + s.budget, 0),
    parts.reduce((a, s) => a + s.buffer, 0),
    parts.reduce((a, s) => a + s.spend, 0),
    parts.reduce((a, s) => a + s.cap, 0),
    day,
    dim,
    parts.flatMap((s) => s.cells),
    parts.flatMap((s) => s.lines),
  );
}

/** The sub-filter values (regions for a BU tab, BUs for a regional tab) that carry any budget or spend. */
export function crossValues(
  cells: SyncCell[],
  lines: AttributedLine[],
  tab: string,
  monthIndex: number,
): string[] {
  const cf = crossOf(tab);
  const bc = cells.filter((c) => c.tab_label === tab);
  const ln = lines.filter((l) => l.tab === tab);
  const values = new Set<string>();
  for (const c of bc) values.add(c[cf]);
  for (const l of ln) values.add(l[cf]);
  return Array.from(values)
    .filter((v) => {
      const budget = bc.filter((c) => c[cf] === v).reduce((a, c) => a + Number(c.amounts[monthIndex] ?? 0), 0);
      const spend = ln.filter((l) => l[cf] === v).reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0);
      return budget !== 0 || spend !== 0;
    })
    .sort();
}

export interface CapacityRow {
  platform: string;
  cap: number;
  actual: number;
  n: number;
  utilization: number | null;
  band: "soft" | "ok" | "delivery-capped";
}

export function computeCapacity(lines: AttributedLine[], day: number): CapacityRow[] {
  const by: Record<string, { platform: string; cap: number; actual: number; n: number }> = {};
  for (const l of lines) {
    if (!l.live) continue;
    const row = (by[l.platform] ??= { platform: l.platform, cap: 0, actual: 0, n: 0 });
    row.cap += Number(l.daily_budget ?? 0);
    row.actual += day > 0 ? Number(l.mtd_spend ?? 0) / day : 0;
    row.n += 1;
  }
  return Object.values(by).map((r) => {
    const u = r.cap > 0 ? r.actual / r.cap : null;
    const band: CapacityRow["band"] =
      u !== null && u > 1.15 ? "soft" : u !== null && u > 0.95 ? "ok" : "delivery-capped";
    return { ...r, utilization: u, band };
  });
}

export const capacityTone = (band: CapacityRow["band"]): Tone =>
  band === "delivery-capped" ? "red" : band === "ok" ? "green" : "slate";

export const capacityNote = (band: CapacityRow["band"]): string =>
  band === "delivery-capped"
    ? "raising the cap does nothing"
    : band === "ok"
      ? "raising the cap adds spend"
      : "lifetime-budget lines skew this ratio";

export interface IntegrityCheck {
  ok: boolean | null;
  title: string;
  detail: string;
  // Which real campaigns make up a failed check's dollar figure — populated
  // only for "Every campaign maps to a budget tab", so "what happened to that
  // $330" gets an actual answer. Zero-spend unmapped campaigns are left out on
  // purpose: they don't contribute to the figure the check warns about, and
  // listing them all would bury the ones that do.
  drilldown?: { name: string; spend: number }[];
}

export function computeIntegrity(
  cells: SyncCell[],
  lines: AttributedLine[],
  monthIndex: number,
): IntegrityCheck[] {
  const unmapped = lines.filter((l) => l.tab === "Unmapped");
  const unmappedSpend = unmapped.reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0);
  const accountTotal = lines.reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0);
  const knownTotal = lines
    .filter((l) => KNOWN_TAB_IDS.has(l.tab))
    .reduce((a, l) => a + Number(l.mtd_spend ?? 0), 0);
  const bufferTotal = cells
    .filter((c) => c.is_buffer)
    .reduce((a, c) => a + Number(c.amounts[monthIndex] ?? 0), 0);
  const unmappedDrilldown = unmapped
    .filter((l) => Number(l.mtd_spend ?? 0) !== 0)
    .map((l) => ({ name: l.campaign_name, spend: Number(l.mtd_spend ?? 0) }))
    .sort((a, b) => b.spend - a.spend);

  return [
    {
      ok: unmapped.length === 0 ? true : unmappedSpend > 0 ? false : null,
      title: "Every campaign maps to a budget tab",
      detail:
        unmapped.length === 0
          ? "Every campaign name attributed to a known tab."
          : `${unmapped.length} campaign(s) didn't parse to a known tab (${fmtMoney(unmappedSpend)} spend this month)`,
      drilldown: unmappedDrilldown.length > 0 ? unmappedDrilldown : undefined,
    },
    {
      // Informational: attribution always yields a known tab or Unmapped, so this
      // sum holds by construction; the check above is what flags real problems.
      ok: null,
      title: "Tab totals reconcile to account total",
      detail: `${fmtMoney(knownTotal)} across 13 tabs + ${fmtMoney(unmappedSpend)} unmapped = ${fmtMoney(accountTotal)} total spend`,
    },
    {
      ok: null,
      title: "Buffer excluded from pacing",
      detail: `${fmtMoney(bufferTotal)} held as buffer this month — shown, never paced`,
    },
  ];
}
