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

// A renewal's start date (2026-10-09, D85): its own opportunity's
// subscription start date, else the day after the renewed opportunity's
// subscription end date. The CadO2 backend applies the same rule to the
// version it stores. When it isn't the day after, the quote warns.
//
//   Renews "APIM Subs 2026"  ends 31 Jan 2027  →  starts 1 Feb 2027

import { formatDate, parseDateString, toDateString } from "./draftForm";

export interface ExpectedRenewalStart {
  /** "YYYY-MM-DD". */
  readonly date: string;
  /** The renewed opportunity it comes from: the one ending last. */
  readonly fromName: string;
}

/**
 * The expected start of a renewal, from the opportunities it renews: the day
 * after the latest end date. Null when none has an end date in Salesforce.
 */
export function expectedRenewalStart(
  renewed: readonly { readonly name: string | null; readonly subsEndDate?: string | null }[],
): ExpectedRenewalStart | null {
  let latest: { name: string; end: string } | null = null;
  for (const o of renewed) {
    if (o.subsEndDate && parseDateString(o.subsEndDate) && (!latest || o.subsEndDate > latest.end)) {
      latest = { name: o.name ?? "", end: o.subsEndDate };
    }
  }
  if (!latest) return null;
  const d = parseDateString(latest.end)!;
  d.setDate(d.getDate() + 1);
  return { date: toDateString(d), fromName: latest.name };
}

/** The warning when the quote starts another day, e.g. "Starts 1 Mar 2027, not 1 Feb 2027, the day after APIM Subs 2026 ends". */
export function renewalStartWarning(start: string, expected: { date: string; fromName: string }): string {
  return `Starts ${formatDate(start)}, not ${formatDate(expected.date)}, the day after ${expected.fromName || "the renewed opportunity"} ends`;
}

/** Where a renewal's locked start date comes from (D85). */
export interface LockedRenewalStart extends ExpectedRenewalStart {
  /** OPPORTUNITY: its own Subs_Start_Date__c; RENEWED: the day after the renewed one ends. */
  readonly source: "OPPORTUNITY" | "RENEWED";
}

/**
 * A renewal's start date, locked (D85): its own opportunity's
 * Subs_Start_Date__c; without one, the day after the renewed opportunity
 * ends; null when neither is in Salesforce (the AM then chooses). The
 * backend applies the same order.
 */
export function lockedRenewalStart(
  opportunity: { readonly name: string | null; readonly subsStartDate?: string | null } | undefined,
  renewed: readonly { readonly name: string | null; readonly subsEndDate?: string | null }[],
): LockedRenewalStart | null {
  if (opportunity?.subsStartDate && parseDateString(opportunity.subsStartDate)) {
    return { date: opportunity.subsStartDate, fromName: opportunity.name ?? "", source: "OPPORTUNITY" };
  }
  const expected = expectedRenewalStart(renewed);
  return expected ? { ...expected, source: "RENEWED" } : null;
}
