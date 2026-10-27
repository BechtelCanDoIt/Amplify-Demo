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

import type { SlaState } from "@features/sales/cado2/approvals/api/approvalTypes";
import { formatDateTime } from "@features/sales/cado2/quotes/form/draftForm";

/** "45 min", "6 h", "6 h 30 min", "2 d 3 h": a length of time, roughly. */
export function duration(ms: number): string {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m && h < 10 ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d} d ${rh} h` : `${d} d`;
}

const DAY_MS = 86_400_000;

/**
 * How a pending step's deadline reads:
 *
 *   BREACHED   "Overdue by 6 h"     red
 *   AT_RISK    "Due in 3 h"         amber
 *   ON_TRACK   "Due in 20 h", or "Due Wed 10:00" a day or more away
 *
 * Times are the viewer's local time; the full date and time is the title.
 */
export function slaLabel(
  state: SlaState,
  dueAt: string,
  now: Date,
): { label: string; color: "error" | "warning" | "default"; title: string } {
  const due = new Date(dueAt);
  const left = due.getTime() - now.getTime();
  // The one date-time format (D14, 2026-10-14); the short chip labels below stay short.
  const title = `Due ${formatDateTime(dueAt)}`;
  if (state === "BREACHED") return { label: `Overdue by ${duration(left)}`, color: "error", title };
  if (state === "AT_RISK") return { label: `Due in ${duration(left)}`, color: "warning", title };
  if (left < DAY_MS) return { label: `Due in ${duration(left)}`, color: "default", title };
  const when =
    left < 6 * DAY_MS
      ? due.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })
      : due.toLocaleString("en-GB", { day: "numeric", month: "short" });
  return { label: `Due ${when}`, color: "default", title };
}
