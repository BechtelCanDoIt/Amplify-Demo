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

import type { PromotionRole } from "../api/types";
import type { PromotionChipColor } from "./promotionStatus";

// Ports source's own per-role chip colours (userLine.tsx / roleSelect.tsx).
// A theme palette role, not a fixed hex — stays legible across every Oxygen
// theme preset instead of only the one it was picked against.
export function promotionRoleChipColor(role: PromotionRole): PromotionChipColor {
  switch (role) {
    case "HR_ADMIN":
      return "error";
    case "FUNCTIONAL_LEAD":
      return "warning";
    case "LEAD":
      return "success";
    case "PROMOTION_BOARD_MEMBER":
      return "info";
    case "EMPLOYEE":
      return "primary";
    default:
      return "info";
  }
}

/** Roles an admin can grant through the User Management form. EMPLOYEE is
 * deliberately excluded — source's own RoleSelector never offers it either
 * (every system user implicitly has baseline employee access; this list is
 * only for the roles that grant something beyond that). */
export const ASSIGNABLE_PROMOTION_ROLES: PromotionRole[] = [
  "HR_ADMIN",
  "FUNCTIONAL_LEAD",
  "LEAD",
  "PROMOTION_BOARD_MEMBER",
];
