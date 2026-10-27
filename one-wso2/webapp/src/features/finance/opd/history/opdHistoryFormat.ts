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


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * `utils.ts#convertUTCtoLocal` — `dayjs.utc(value).local().format("DD-MMM-YYYY")`.
 *
 * `createdDate` and the approval dates arrive as `"2026-09-17 03:54:47.0"`: a
 * UTC timestamp with a space instead of a `T` and no zone marker. The shared
 * `formatNice` regex-matches only the `YYYY-MM-DD` head and drops the time, so
 * it reads that as a LOCAL calendar day. The two agree for most of the day and
 * disagree by a full day for anything stamped after ~18:30 UTC — a claim filed
 * at 20:00 UTC is already tomorrow in Colombo. This screen sits beside the
 * source app in people's minds, so it follows the source: parse as UTC, render
 * in the viewer's zone.
 *
 * The parsing is a near-twin of `expense/history/expenseHistoryFormat.ts` and
 * is deliberately not shared with it: that module is Expense's, and the two
 * differ in output (`17-Sep-2026` here, `Sep 17, 2026` there) because each
 * follows its own source app. Worth promoting into `util/financeFormat` if a
 * third screen ever needs it.
 */
export function historyDate(value: string | null | undefined): string {
  const d = parseUtcTimestamp(value);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

/**
 * Accepts both the timestamp form above and a bare `YYYY-MM-DD` (which the
 * backend uses for bill dates). A bare date has no time to misread, so it is
 * built from local fields — treating it as UTC midnight would shift it a day
 * backwards for anyone west of Greenwich.
 */
export function parseUtcTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Anchored at both ends, with fractional seconds and a trailing Z allowed.
  // An unanchored prefix match accepted "…T03:54:47+05:30" and then handed the
  // head to Date.UTC, throwing the offset away and reporting a time that was
  // hours out. A shape we cannot read is better shown as "—" than as a
  // confident wrong answer. `Z` is kept because it says UTC, which is what this
  // already assumes.
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?)?$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  const date =
    hh === undefined
      ? new Date(Number(y), Number(mo) - 1, Number(d))
      : new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
  return Number.isNaN(date.getTime()) ? null : date;
}
