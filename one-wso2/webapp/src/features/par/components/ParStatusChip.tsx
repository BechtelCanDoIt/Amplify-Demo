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

import { Chip } from "@wso2/oxygen-ui";
import { employeeChipLabel } from "../util/parLabels";

const COMPLETED_VALUES = new Set(["SHARED", "SHARED_BLOCKED", "COMPLETED"]);
const PENDING_VALUES = new Set(["PENDING"]);

// Ports ParStatusChip.tsx: the one chip renderer TeamSummary.tsx's roster
// grid (and, later, Review.tsx's 360 monitoring table) uses for every
// status/rating column. Source rendered completed/pending as a silent icon
// avatar with a tooltip; every status everywhere else in this app (REJECTED,
// DRAFT, a rating code, Leave's own StatusChip) is a coloured, labelled
// outlined chip instead — matching that instead of the source's one-off icon
// treatment, reusing employeeChipLabel for the rating-code half, since that
// mapping already exists for EmployeePar.tsx's own chips.
// Same compact outlined-chip treatment "My Team" uses for its own status
// column (features/my/my-team/components/MyTeamTable.tsx).
const CHIP_SX = { height: 20, fontSize: 10.5, fontWeight: 600, borderWidth: 1.5, minWidth: 72 };

export default function ParStatusChip({
  content,
  countDetails,
}: {
  content: string;
  countDetails?: { completed: number; total: number };
}) {
  if (countDetails) {
    const { color } = employeeChipLabel(content);
    return (
      <Chip
        size="small"
        variant="outlined"
        color={COMPLETED_VALUES.has(content) ? "success" : color}
        label={`${countDetails.completed}/${countDetails.total}`}
        sx={CHIP_SX}
      />
    );
  }

  if (COMPLETED_VALUES.has(content)) {
    return <Chip size="small" variant="outlined" color="success" label="Completed" sx={CHIP_SX} />;
  }
  if (PENDING_VALUES.has(content)) {
    return <Chip size="small" variant="outlined" color="warning" label="Pending" sx={CHIP_SX} />;
  }
  if (content === "REJECTED") {
    return <Chip size="small" variant="outlined" color="error" label="Rejected" sx={CHIP_SX} />;
  }
  if (content === "DRAFT") {
    return <Chip size="small" variant="outlined" color="info" label="Draft" sx={CHIP_SX} />;
  }

  const { label, color } = employeeChipLabel(content || "NOT_ASSIGNED");
  return <Chip size="small" variant="outlined" color={color} label={label} sx={CHIP_SX} />;
}
