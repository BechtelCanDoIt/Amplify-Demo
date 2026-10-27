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

// Pure credit-scoring math, ported from the source app's
// Resellers/ResellerDashboard/CreditScore/CreditScoreChecking.js. Kept as
// plain functions (no React) so the arithmetic can be read and, if ever
// needed, tested in isolation from rendering.
//
// This is a literal port, not a redesign — every rounding call and
// per-category quirk below is copied intentionally, including the ones that
// look like they could be unified. In particular: the ratio-scale matcher
// includes an "id === 0 && value === scale.minVal" boundary rule for
// Current ratio / Cash ratio / Debt ratio / Rating scale, but NOT for WC /
// Revenue / Revenue growth — that split is in the source, not a mistake here.
//
// One deliberate deviation: the source guards each ratio with `isNaN(value)`
// only, which lets a non-zero-over-zero division through as Infinity (0/0
// alone is what NaN catches) straight into the table and the PDF report.
// That's a display bug with no business-rule content to preserve, so these
// use `!Number.isFinite(value)` instead — catches both NaN and ±Infinity,
// same as convertToDollars' own exchange-rate guard above.

import type { CreditScoreItem } from "../api/creditScoreTypes";
import type { CreditScoreRatio } from "@features/due-diligence/preferences/api/usePreferences";

// Permissive on purpose: a saved CreditScoreItem has numeric (or null
// exchangeRate) fields, while WorkingsForRatios' in-progress draft holds ""
// for a field the user hasn't filled in yet. Every function below reads
// through `Number(...)`, so both shapes flow through the same math — the
// only place the distinction matters is `checkObjectComplete`, which checks
// for "" explicitly before any arithmetic runs.
export type YearData = Partial<Record<keyof CreditScoreItem, number | string | null>>;

/** `year1[category] / year1.exchangeRate`, rounded to 2dp — every field except companyId/year/exchangeRate. */
export function convertToDollars(obj: YearData): YearData {
  const out: YearData = { ...obj };
  // Not part of the source's own math — a zero/missing exchange rate isn't
  // rejected upstream (checkObjectComplete explicitly excludes it), so
  // without this guard a blank or 0 rate turns every field into Infinity/NaN
  // here, which then gets rendered straight into the credit-score table and
  // the generated PDF report.
  const rate = Number(obj.exchangeRate);
  if (!Number.isFinite(rate) || rate <= 0) return out;
  for (const key of Object.keys(obj) as (keyof YearData)[]) {
    if (key === "companyId" || key === "year" || key === "exchangeRate") continue;
    const raw = obj[key];
    out[key] = Math.round((Number(raw) / rate) * 100) / 100;
  }
  return out;
}

function formatNumber(n: number): number {
  return typeof n === "number" ? n : 0;
}

/** True when every field on the object is a real value — "" (the WorkingsForRatios in-progress state) fails this. */
export function checkObjectComplete(obj: YearData): boolean {
  return Object.values(obj).every((v) => v !== "" && v !== undefined);
}

export function calculateCurrentRatio(years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number | "-" | "" {
  const y = years[year];
  if (!checkObjectComplete(y)) return "";
  const value = formatNumber(Math.round((Number(y.currentAssets) / Number(y.currentLiability)) * 100) / 100);
  return !Number.isFinite(value) ? "-" : value;
}

export function calculateCashRatio(years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number | "-" {
  const y = years[year];
  const value = formatNumber(
    Math.round(((Number(y.cash) + Number(y.investments)) / Number(y.currentLiability)) * 100) / 100,
  );
  return !Number.isFinite(value) ? "-" : value;
}

export function calculateWorkingCapitalRatio(years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number {
  const y = years[year];
  return formatNumber(Math.round((Number(y.currentAssets) - Number(y.currentLiability)) * 100) / 100);
}

export function calculateDebtRatio(years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number | "-" {
  const y = years[year];
  const value = formatNumber(Math.round((Number(y.totalDebt) / Number(y.totalAssets)) * 100) / 100);
  return !Number.isFinite(value) ? "-" : value;
}

export function getRevenue(years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number {
  return formatNumber(Number(years[year].revenue));
}

export function getProfit(years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number {
  return formatNumber(Number(years[year].profit));
}

/** Only defined for year 2 (vs year 1) and year 3 (vs year 2) — there is no "year before" for year 1. */
export function calculateRevenueGrowth(years: Record<1 | 2 | 3, YearData>, year: 2 | 3): number | "" {
  const curr = years[year];
  const prev = years[(year - 1) as 1 | 2];
  const value = formatNumber(Math.round(((Number(curr.revenue) - Number(prev.revenue)) / Number(prev.revenue)) * 10000) / 100);
  return !Number.isFinite(value) ? "" : value;
}

export function calculateCurrentAssetYoY(years: Record<1 | 2 | 3, YearData>, year: 2 | 3): number | "" {
  const curr = years[year];
  const prev = years[(year - 1) as 1 | 2];
  const value = formatNumber(
    Math.round(((Number(curr.currentAssets) - Number(prev.currentAssets)) / Number(prev.currentAssets)) * 10000) / 100,
  );
  return !Number.isFinite(value) ? "" : value;
}

export function calculateCurrentLiabilityYoY(years: Record<1 | 2 | 3, YearData>, year: 2 | 3): number | "" {
  const curr = years[year];
  const prev = years[(year - 1) as 1 | 2];
  const value = formatNumber(
    Math.round(((Number(curr.currentLiability) - Number(prev.currentLiability)) / Number(prev.currentLiability)) * 10000) /
      100,
  );
  return !Number.isFinite(value) ? "" : value;
}

export type RatioCategory = "Current ratio" | "Cash ratio" | "WC" | "Debt ratio" | "Revenue" | "Revenue growth";
const CATEGORIES_WITH_FIRST_BOUNDARY = new Set<RatioCategory | "Rating scale">(["Current ratio", "Cash ratio", "Debt ratio", "Rating scale"]);

/**
 * The one rule shared by every ratio-scale lookup below: find the bracket
 * `value` falls into and return its creditScore, or "0" if none matches.
 * `includeFirstBoundary` reproduces the source's inconsistency — three
 * categories (plus Rating scale) additionally treat `value === scale.minVal`
 * on the FIRST bracket as a match; the other three don't.
 *
 * `value` can arrive as the string "-" (a calculation's NaN fallback, e.g.
 * a 0/0 ratio) — coerced to a number up front, same as JS's own implicit
 * coercion on `<=`/`>` against a string. `Number("-")` is NaN, so every
 * comparison below (including the id-0 equality one, since scale.minVal is
 * always a real number when not null) safely evaluates to false, matching
 * what the untyped source does without special-casing it.
 */
function matchRatioScale(scaleArray: CreditScoreRatio[], rawValue: number | string, includeFirstBoundary: boolean): string {
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
  let returnValue = "";
  scaleArray.forEach((scale, id) => {
    if (scale.minVal === null && value <= (scale.maxVal as number)) {
      returnValue = scale.creditScore;
    } else if (scale.maxVal === null && value > (scale.minVal as number)) {
      returnValue = scale.creditScore;
    } else if (value > (scale.minVal as number) && value <= (scale.maxVal as number)) {
      returnValue = scale.creditScore;
    } else if (includeFirstBoundary && id === 0 && value === scale.minVal) {
      returnValue = scale.creditScore;
    }
  });
  return returnValue || "0";
}

function categoryValue(years: Record<1 | 2 | 3, YearData>, category: RatioCategory, year: 1 | 2 | 3): number | string {
  switch (category) {
    case "Current ratio":
      return calculateCurrentRatio(years, year);
    case "Cash ratio":
      return calculateCashRatio(years, year);
    case "WC":
      return calculateWorkingCapitalRatio(years, year);
    case "Debt ratio":
      return calculateDebtRatio(years, year);
    case "Revenue":
      return getRevenue(years, year);
    case "Revenue growth":
      return year === 1 ? "" : calculateRevenueGrowth(years, year);
  }
}

/** The ratio-scale credit score for one category, for a SPECIFIC year — used for the per-year columns. */
export function getRatio(ratios: CreditScoreRatio[], years: Record<1 | 2 | 3, YearData>, category: RatioCategory, year: 1 | 2 | 3): string {
  const scaleArray = ratios.filter((r) => r.ratioCategory === category);
  if (scaleArray.length === 0) return "0";
  return matchRatioScale(scaleArray, categoryValue(years, category, year), CATEGORIES_WITH_FIRST_BOUNDARY.has(category));
}

/** The LATEST complete year (3, else 2, else 1) — used for the single "Financial Credit Score" column. */
function latestCompleteYear(years: Record<1 | 2 | 3, YearData>): 1 | 2 | 3 | undefined {
  if (checkObjectComplete(years[3])) return 3;
  if (checkObjectComplete(years[2])) return 2;
  if (checkObjectComplete(years[1])) return 1;
  return undefined;
}

export function getFinancialCreditScore(ratios: CreditScoreRatio[], years: Record<1 | 2 | 3, YearData>, category: RatioCategory): string {
  const year = latestCompleteYear(years);
  if (year === undefined) return "0";
  return getRatio(ratios, years, category, year);
}

const CREDIT_SCORE_CATEGORIES: RatioCategory[] = ["Current ratio", "Cash ratio", "WC", "Debt ratio", "Revenue", "Revenue growth"];

export function calculateTotalCreditScore(ratios: CreditScoreRatio[], years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): number | "-" {
  const sum = CREDIT_SCORE_CATEGORIES.reduce((acc, cat) => acc + parseInt(getRatio(ratios, years, cat, year), 10), 0);
  return Number.isNaN(sum) ? "-" : sum;
}

export function calculateFinalTotalCreditScore(ratios: CreditScoreRatio[], years: Record<1 | 2 | 3, YearData>): number {
  return CREDIT_SCORE_CATEGORIES.reduce((acc, cat) => acc + parseInt(getFinancialCreditScore(ratios, years, cat), 10), 0);
}

export function calculateCreditRating(ratios: CreditScoreRatio[], years: Record<1 | 2 | 3, YearData>, year: 1 | 2 | 3): string {
  const value = calculateTotalCreditScore(ratios, years, year);
  const scaleArray = ratios.filter((r) => r.ratioCategory === "Rating scale");
  return matchRatioScale(scaleArray, value, true);
}

export function calculateFinalCreditRating(ratios: CreditScoreRatio[], years: Record<1 | 2 | 3, YearData>): string {
  const value = calculateFinalTotalCreditScore(ratios, years);
  const scaleArray = ratios.filter((r) => r.ratioCategory === "Rating scale");
  return matchRatioScale(scaleArray, value, true);
}
