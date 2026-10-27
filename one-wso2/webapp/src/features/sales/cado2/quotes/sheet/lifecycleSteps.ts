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

import type { AuditEvent, DraftResponse } from "@features/sales/cado2/quotes/api/quoteTypes";
import { formatDate } from "@features/sales/cado2/quotes/form/draftForm";
import { roleLabel } from "@features/sales/cado2/approvals/model/approvalText";

const day = (iso: string) => formatDate(iso.slice(0, 10));

export interface LifecycleStep {
  readonly label: string;
  readonly when: string;
  readonly who?: string;
  readonly note?: string | null;
  readonly done: boolean;
  readonly tone?: "error" | "warning" | "success";
}



/** The version's lifecycle, from its audit events, plus what comes next. */
export function lifecycleSteps(res: DraftResponse, events: readonly AuditEvent[]): LifecycleStep[] {
  const v = res.version;
  const mine = events.filter((e) => e.versionNumber === v.versionNumber);
  const steps: LifecycleStep[] = [];
  for (const e of mine) {
    if (e.eventType === "QUOTE_CREATED" || e.eventType === "VERSION_CREATED") {
      steps.push({ label: e.eventType === "QUOTE_CREATED" ? "Quote created" : `Revised from v${v.copiedFromVersion ?? "?"}`, when: day(e.occurredAt), who: e.actorEmail, done: true });
    } else if (e.eventType === "VERSION_SUBMITTED") {
      steps.push({ label: "Submitted", when: day(e.occurredAt), who: e.actorEmail, done: true });
    } else if (e.eventType === "VERSION_RECALLED") {
      steps.push({ label: "Recalled", when: day(e.occurredAt), who: e.actorEmail, note: e.comment, done: true, tone: "warning" });
    } else if (e.eventType === "VERSION_APPROVED") {
      steps.push({ label: "Approved", when: day(e.occurredAt), who: e.actorEmail, done: true, tone: "success" });
    } else if (e.eventType === "APPROVAL_REJECTED" || e.eventType === "APPROVAL_RETURNED") {
      const role = typeof e.metadata?.role === "string" ? roleLabel(e.metadata.role) : "An approver";
      steps.push({
        label: e.eventType === "APPROVAL_REJECTED" ? `Rejected by ${role}` : `Returned by ${role}`,
        when: day(e.occurredAt),
        who: e.actorEmail,
        note: e.comment,
        done: true,
        tone: e.eventType === "APPROVAL_REJECTED" ? "error" : "warning",
      });
    } else if (e.eventType === "QUOTE_CLOSED") {
      steps.push({ label: "Quote closed", when: day(e.occurredAt), who: e.actorEmail, note: e.comment, done: true, tone: "error" });
    }
  }
  // The closure is also stored on the version itself, so it shows even
  // before (or without) the history.
  if (v.status === "CLOSED" && !steps.some((s) => s.label === "Quote closed")) {
    steps.push({
      label: "Quote closed",
      when: v.closedAt ? day(v.closedAt) : "",
      who: v.closedByEmail ?? undefined,
      note: v.closedReason,
      done: true,
      tone: "error",
    });
  }
  if (v.status === "DRAFT") steps.push({ label: "Submit", when: "Not yet", done: false });
  if (v.status === "SUBMITTED") steps.push({ label: "In approval", when: "See Approvals", done: false });
  // The expiry is the chip above the timeline, once (C4, 2026-10-14).
  return steps;
}
