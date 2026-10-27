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

import type { ParCycle } from "../api/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Matches `YYYY-MM-DD` — the only shape the backend's own par-cycle
 * deadline fields carry, same as parDeadline.ts's own DATE_ONLY_RE. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `dayjs().diff(date, "day", true)` — days between now and `date`,
 * fractional, positive once `date` is in the past. An absent date (source's
 * own `parSpecialRatingDeadline?` is optional on the type) never counts as
 * passed.
 *
 * `new Date("YYYY-MM-DD")` parses as UTC midnight, not local midnight — in a
 * negative UTC offset that's still the previous evening locally, so this
 * would read as "passed" up to several hours early. Appending a bare time
 * (no zone) switches the same constructor to local-time parsing, matching
 * how isDeadlinePassed (parDeadline.ts) already avoids this. */
function daysSince(date: string | undefined, now: Date): number {
  if (!date) return -Infinity;
  const parsed = DATE_ONLY_RE.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
  return (now.getTime() - parsed.getTime()) / DAY_MS;
}

// Ports TeamSummary.tsx's own useEffect: which of the cycle-dates stepper's
// five steps to land on, based on which deadlines have actually passed —
// unlike MultiTeamSummary.tsx's copy of the same stepper, which never
// advances past step 0. The four checks aren't else-if in source, so the
// last one that matches wins; the `- 1` on the lead deadline is source's
// own (undocumented) one-day grace before that step advances — kept as-is,
// not smoothed into the same shape as the other three.
export function calculateCycleActiveStep(
  cycle: Pick<ParCycle, "parEmployeeDeadline" | "parLeadDeadline" | "parSpecialRatingDeadline" | "parEvaluationEndDate">,
  now: Date = new Date(),
): number {
  let step = 0;
  if (daysSince(cycle.parEmployeeDeadline, now) >= 0) step = 1;
  if (daysSince(cycle.parLeadDeadline, now) - 1 >= 0) step = 2;
  if (daysSince(cycle.parSpecialRatingDeadline, now) >= 0) step = 3;
  if (daysSince(cycle.parEvaluationEndDate, now) >= 0) step = 4;
  return step;
}
