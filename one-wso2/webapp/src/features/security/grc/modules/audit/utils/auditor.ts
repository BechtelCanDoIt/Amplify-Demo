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

import type { AuditControl } from "@features/security/grc/modules/audit/types/audit";

/**
 * True when the signed-in user is this control's assigned auditor POC — mirrors
 * the backend check (matching control.AuditorID against the caller's resolved
 * user id; see requireAssignedAuditor), but compares uuids since that's what's
 * on the token here. This is UI gating only: a mismatch here just hides a
 * card/button, it never grants access, since the backend re-derives and
 * enforces the check independently.
 *
 * The source's mock-auth short-circuit is REMOVED for One WSO2. It returned true
 * unconditionally, showing every auditor-only surface to every user whenever a
 * config flag was set — the widest of the bypasses this module carried. See the
 * deviation register.
 */
export function isAssignedAuditor(control: Pick<AuditControl, "auditorUuid">, currentUserId: string | null): boolean {
  if (!currentUserId || !control.auditorUuid) return false;
  return control.auditorUuid === currentUserId;
}
