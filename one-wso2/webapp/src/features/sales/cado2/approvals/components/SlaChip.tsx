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

import type { JSX } from "react";
import type { SlaState } from "@features/sales/cado2/approvals/api/approvalTypes";
import { slaLabel } from "@features/sales/cado2/approvals/sla";
import StatusChip from "@features/sales/cado2/components/status-chip/StatusChip";

/** A pending step's deadline: "Overdue by 6 h", "Due in 3 h", "Due Wed 10:00". */
export default function SlaChip({ state, dueAt, now = new Date() }: { state: SlaState; dueAt: string; now?: Date }): JSX.Element {
  const s = slaLabel(state, dueAt, now);
  return (
    // Filled only when overdue: the one thing that must shout (2026-10-14).
    <StatusChip
      color={s.color}
      urgent={s.color === "error"}
      label={s.label}
      title={s.title}
      aria-label={`${s.label} (${s.title})`}
    />
  );
}
