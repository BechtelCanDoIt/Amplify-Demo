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

import type { PromotionRequestStatus, RecommendationStatus } from "../api/types";

// Ports promotion-app's own utils/utils.ts status→colour/label helpers,
// used by the Lead Portal's History tab (and, once ported, every other
// history-style grid this app's admin/board/functional-lead portals show).

// A theme palette role, not a fixed hex — a Chip tinted with one of these
// stays legible across every Oxygen theme preset instead of only the one
// it was picked against.
export type PromotionChipColor = "default" | "primary" | "secondary" | "success" | "error" | "warning" | "info";

/** A cycle-scoped request status reads as "in progress" while its cycle is
 * still the open one — otherwise the raw status (APPROVED/REJECTED/...)
 * would misleadingly look final for a request whose cycle can still move
 * it further (e.g. FL_APPROVED still needs the Promotion Board). */
export function promotionRequestStatusLabel(
  status: PromotionRequestStatus,
  isActiveCycle: boolean,
): PromotionRequestStatus {
  if (
    isActiveCycle &&
    (status === "APPROVED" || status === "REJECTED" || status === "FL_APPROVED" ||
      status === "FL_REJECTED" || status === "SUBMITTED")
  ) {
    return "IN_PROGRESS";
  }
  return status;
}

// Same semantic convention ParStatusChip already established for this app's
// other status chips: pending/in-progress reads as warning, draft reads as
// info (not a muted/neutral default — a draft is still something live, just
// not submitted yet), completed as success, rejected as error.
export function promotionRequestChipColor(status: PromotionRequestStatus): PromotionChipColor {
  switch (status) {
    case "APPROVED":
      return "success";
    case "IN_PROGRESS":
    case "FL_APPROVED":
    case "WITHDRAW":
      return "warning";
    case "DECLINED":
    case "FL_REJECTED":
    case "REJECTED":
    case "REMOVED":
      return "error";
    case "SUBMITTED":
      return "primary";
    case "DRAFT":
      return "info";
    case "EXPIRED":
      return "default";
    default:
      return "info"; // REQUESTED, ACTIVE, PROCESSING
  }
}

export function recommendationChipColor(status: RecommendationStatus): PromotionChipColor {
  switch (status) {
    case "SUBMITTED":
      return "success";
    case "DECLINED":
      return "error";
    case "EXPIRED":
      return "default";
    default:
      return "warning"; // REQUESTED — shown as "Pending", same as ParStatusChip's own Pending
  }
}

/** Source shows "APPROVED" for a SUBMITTED recommendation — the lead's own
 * act of submitting IS their approval of the recommendation; SUBMITTED is
 * the wire status, "Approved" is what it means to the lead reading it. */
export function recommendationStatusLabel(status: RecommendationStatus): string {
  return status === "SUBMITTED" ? "APPROVED" : status;
}
