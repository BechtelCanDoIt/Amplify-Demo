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


import type { OpdClaim, OpdClaimSearchPayload, OpdClaimStatus } from "../opdTypes";
import { opdStatusFilter } from "../opdTypes";

/**
 * What the Claim History screen is filtered by.
 *
 * `filterSlice.ts` holds the same three things: a year range, a set of
 * statuses, and a claim id. Kept as one object so the screen has a single
 * piece of filter state to pass around and a single thing to reset.
 */
export interface OpdHistoryFilters {
  /** `FilterHolder.tsx:120` — This Year / Last Year / a custom span. */
  period: OpdHistoryPeriod;
  /** Only read when `period` is "custom". */
  startYear: number;
  endYear: number;
  /** Empty means every status; see `opdStatusFilter` for the PENDING_OLD rule. */
  statuses: OpdClaimStatus[];
  /** Trimmed before it goes on the wire; empty means no id filter. */
  claimId: string;
}

export type OpdHistoryPeriod = "this" | "last" | "custom";

export function opdPeriodLabel(period: OpdHistoryPeriod): string {
  switch (period) {
    case "this":
      return "This Year";
    case "last":
      return "Last Year";
    default:
      return "Custom";
  }
}

/** The screen's starting point: this year, every status, no id. */
export function emptyOpdHistoryFilters(now = new Date()): OpdHistoryFilters {
  const year = now.getFullYear();
  return { period: "this", startYear: year, endYear: year, statuses: [], claimId: "" };
}

/**
 * The years a period covers.
 *
 * A custom span is ordered here rather than trusted from the pickers: the
 * source lets either end be set first (`YearPicker.tsx`), so a person can
 * legitimately pick 2024 as the end before picking 2023 as the start, and a
 * backwards range would come back empty rather than wrong — which reads as a
 * bug in the data, not in the filter.
 */
export function opdYearBounds(
  filters: OpdHistoryFilters,
  now = new Date(),
): { startYear: number; endYear: number } {
  const current = now.getFullYear();
  switch (filters.period) {
    case "this":
      return { startYear: current, endYear: current };
    case "last":
      return { startYear: current - 1, endYear: current - 1 };
    default:
      return {
        startYear: Math.min(filters.startYear, filters.endYear),
        endYear: Math.max(filters.startYear, filters.endYear),
      };
  }
}

/**
 * The filters as `POST /search-claims` wants them.
 *
 * `email` scopes the search to the signed-in person. The backend resolves the
 * caller from the token when it is absent, but sending it keeps History
 * honest about being *your* claims — and the same endpoint serves Approvals,
 * where it must not be.
 */
export function toOpdSearchPayload(
  filters: OpdHistoryFilters,
  email: string | null | undefined,
  now = new Date(),
): OpdClaimSearchPayload {
  const { startYear, endYear } = opdYearBounds(filters, now);
  const id = filters.claimId.trim();
  return {
    email: email ?? null,
    startYear,
    endYear,
    status: opdStatusFilter(filters.statuses) ?? null,
    // A blank box is no filter at all. Sending `[""]` would ask the backend for
    // a claim whose id is the empty string and come back with nothing.
    ids: id ? [id] : null,
  };
}

/** Whether anything is narrowing the list, for the "clear" affordance. */
export function hasActiveOpdFilters(filters: OpdHistoryFilters): boolean {
  return filters.period !== "this" || filters.statuses.length > 0 || filters.claimId.trim() !== "";
}

// ---- the activity trail -----------------------------------------------------

/**
 * One row of the Claim Activity trail.
 *
 * `ClaimTable.tsx:250-267` draws exactly two: the submission, which has always
 * happened, and the finance review, which may not have yet. Modelled as data
 * rather than two hand-written blocks so the drawer renders a list and the
 * rules stay testable.
 */
export interface OpdActivityStep {
  label: "Claim Submission" | "Finance Review";
  /** ISO datetime, or null when the step has not happened yet. */
  date: string | null;
  /** The parenthesised word after the label — only the review carries one. */
  state: "done" | "Pending" | "Approved" | "Rejected" | "Unknown";
  /**
   * What the backend actually said, when it said something this app does not
   * recognise. `opdStatusMeta` shows such a value verbatim rather than guessing
   * at it, and the trail does the same instead of calling it pending.
   */
  rawStatus?: string;
  /** Finance's words, on a rejection. */
  reason?: string | null;
}

/**
 * `CustomTimelineItem.tsx:33-70` — the two steps, and what each says.
 *
 * PENDING_OLD reads as "Pending" like PENDING: it is the same state under an
 * older name, and showing the raw value would put a word on screen that means
 * nothing to the person reading it.
 */
export function opdActivitySteps(claim: OpdClaim): OpdActivityStep[] {
  const details = claim.statusDetails;
  const status = details.status;
  // Absent reads as pending, matching `opdStatusMeta`, which maps null and
  // undefined onto PENDING. PENDING_OLD is the same state under an older name.
  // Anything else is a value this app has never heard of: showing it as pending
  // would state something about the claim that nobody told us.
  const isPending = status == null || status === "PENDING" || status === "PENDING_OLD";
  const review: OpdActivityStep =
    status === "APPROVED"
      ? { label: "Finance Review", date: details.financeApprovedDate, state: "Approved" }
      : status === "REJECTED"
        ? {
            label: "Finance Review",
            date: details.financeRejectedDate,
            state: "Rejected",
            reason: details.financeRejectedReason ?? null,
          }
        : isPending
          ? { label: "Finance Review", date: null, state: "Pending" }
          : { label: "Finance Review", date: null, state: "Unknown", rawStatus: status };

  return [{ label: "Claim Submission", date: claim.createdDate, state: "done" }, review];
}
