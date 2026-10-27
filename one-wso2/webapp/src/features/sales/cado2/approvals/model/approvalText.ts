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

import type { StepStatus, WorkflowStatus } from "@features/sales/cado2/approvals/api/approvalTypes";

/** Role labels, for places that only have the code (e.g. audit metadata). */
export const ROLE_LABEL: Record<string, string> = {
  ACCOUNT_MANAGER: "Account Manager",
  DEAL_DESK: "Deal Desk",
  LEGAL: "Legal",
  FIELD_ENGINEERING: "Field Engineering",
  SUPPORT: "Support",
  ENGINEERING: "Engineering",
  REGIONAL_DIRECTOR: "Regional Director",
  AREA_GM: "Area GM",
  CRO: "CRO",
  CHIEF_OF_STAFF: "Chief of Staff",
  CFO: "CFO",
  CEO: "CEO",
};

export const roleLabel = (code: string): string => ROLE_LABEL[code] ?? code;

type Tone = "default" | "primary" | "success" | "warning" | "error" | "info";

export const STEP_STATUS: Record<StepStatus, { label: string; color: Tone }> = {
  WAITING: { label: "Waiting", color: "default" },
  PENDING: { label: "Their turn", color: "primary" },
  APPROVED: { label: "Approved", color: "success" },
  RETURNED: { label: "Returned", color: "warning" },
  CANCELLED: { label: "Not needed", color: "default" },
};

export const WORKFLOW_STATUS: Record<WorkflowStatus, { label: string; color: Tone }> = {
  IN_PROGRESS: { label: "In approval", color: "primary" },
  APPROVED: { label: "Approved", color: "success" },
  RETURNED: { label: "Returned", color: "warning" },
  RECALLED: { label: "Stopped (recalled)", color: "warning" },
};

export const LANE_LABEL = {
  DISCOUNT: "Discount approvals",
  COMMERCIAL: "Commercial approvals",
} as const;
