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

// The sabbatical rules, as pure functions of their inputs.
//
// Transcribed from ApplyTab.tsx rather than reasoned about: the two config
// values are DAYS (2555 and 42 by default) but every message speaks in years
// and weeks.

/** Days shown as years to one decimal place, so 2555 → 7. */
export function eligibilityYears(eligibilityDurationDays: number): number {
  return parseFloat((eligibilityDurationDays / 365).toFixed(1));
}

/** ApplyTab.tsx:104-106 — a plain divide, no rounding, so 42 → 6. */
export function maxDurationWeeks(maxApplicationDurationDays: number): number {
  return maxApplicationDurationDays / 7;
}

/**
 * Whole days from `anchor` to `start` — the same count the leave backend
 * checks on submit, so the form never refuses a start date the server would
 * accept.
 *
 * Both ends are normalised to midnight first, so a time-of-day difference cannot
 * shift the result by a day.
 */
export function eligibilityGapDays(anchor: Date, start: Date): number {
  const a = new Date(anchor);
  const s = new Date(start);
  a.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);
  return Math.round((s.getTime() - a.getTime()) / 86_400_000);
}

/** ApplyTab.tsx:168-169 — eligible once the gap reaches the configured days. */
export function isEligible(
  anchor: Date,
  start: Date,
  eligibilityDurationDays: number,
): boolean {
  return eligibilityGapDays(anchor, start) >= eligibilityDurationDays;
}

/**
 * Why the job band keeps someone from applying, or null when it does not —
 * mirrors the backend's check on POST /leaves. No band recorded is its own
 * case: the fix is a profile update by People Operations, not a promotion.
 */
export function jobBandBlock(jobBand: number | null, minJobBand: number): "missing" | "below" | null {
  if (jobBand === null) return "missing";
  return jobBand < minJobBand ? "below" : null;
}

/** ApplyTab.tsx:194 — inclusive of both ends, so a single day is 1. */
export function requestedDurationDays(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

/** ApplyTab.tsx:194-195 — strictly greater than the limit is too long. */
export function exceedsMaxDuration(
  start: Date,
  end: Date,
  maxApplicationDurationDays: number,
): boolean {
  return requestedDurationDays(start, end) > maxApplicationDurationDays;
}
