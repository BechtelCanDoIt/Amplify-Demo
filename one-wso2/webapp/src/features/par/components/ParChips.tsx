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

import { Chip, Tooltip, type SxProps, type Theme } from "@wso2/oxygen-ui";
import type { Par360ReviewStatus } from "../api/types";

// Shared by ParRequestFeedbackTab and ParProvideFeedbackTab — par-app's
// ParStatusChip.tsx, one status vocabulary for both screens.
const STATUS_LABEL: Record<Par360ReviewStatus, string> = {
  PENDING: "Pending",
  DRAFT: "Draft",
  SHARED: "Completed",
  REJECTED: "Declined",
  SANITIZED: "Unavailable",
};

export function Par360StatusChip({ status }: { status: Par360ReviewStatus }) {
  const color =
    status === "SHARED" ? "success" : status === "REJECTED" ? "error" : status === "DRAFT" ? "warning" : "default";
  return <Chip size="small" color={color} variant="outlined" label={STATUS_LABEL[status]} />;
}

/** Marks a rating the system auto-assigned after a missed deadline. */
export function ParAutoAssignedChip({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Tooltip title="Automatically assigned by the system because the PAR deadline was missed">
      <Chip size="small" color="warning" variant="outlined" label="Auto-assigned (deadline missed)" sx={sx} />
    </Tooltip>
  );
}
