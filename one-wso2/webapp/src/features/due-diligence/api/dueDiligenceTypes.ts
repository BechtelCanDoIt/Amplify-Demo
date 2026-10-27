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

// Wire type + the role predicate for the Due Diligence backend
// (digiops-finance/apps/due_diligence/backend/admin).
//
// The backend computes a set of internal role names from the caller's
// Asgardeo groups (see modules/authorisation/ and the new `get user-info`
// resource in service.bal) and returns ONLY those names — never the raw
// group names, never the caller's email. Everything in this file exists to
// keep that vocabulary in one place instead of role-name strings leaking
// into components.

// A due-diligence role name, as the gate refers to it. Matches the
// `public configurable string` vars in the backend's
// modules/authorisation/constants.bal — this list has to stay in step with
// that file.
//
// Two of these (financeSpecialApprover, legalRole) aren't in that file's
// original 9 — they were added after cross-checking against the client
// webapp's own REACT_APP_ROLES, which distinguishes:
//   - "legal" (broad: on the legal team — see the Legal tab, request due
//     diligence, toggle trade reference, copy the client link) from
//     "legalApprover" (narrow: may give the legal approval decision itself).
//   - "financeSpecialApprover" (may answer the special-approval question)
//     from "financeApprover" (may request special approval).
// Conflating either pair into the narrower role would silently deny an
// action to someone the source app grants it to.
//
// Deliberately a CLOSED union, while the wire field below is a plain
// `string[]`: anything this frontend *looks up* must be a role that really
// exists (a typo becomes a compile error, not a silently-never-matching
// gate), while anything the backend *sends* must deserialise even if it's a
// role this frontend has never heard of.
export type DueDiligenceRole =
  | "employeeRole"
  | "financeRole"
  | "superRole"
  | "financeApprover"
  | "financeSpecialApprover"
  | "legalRole"
  | "legalApprover"
  | "financialCreator"
  | "financialReviewer"
  | "adminRole"
  | "channelManager";

// GET /user-info. Authenticated but deliberately NOT gated — an
// authenticated caller who holds none of the due-diligence Asgardeo groups
// still gets a 200 with `roles: []`, which is what lets the UI render an
// honest "you don't have access" state instead of a bare 403.
export interface UserInfoResponse {
  // Plain `string[]`, not DueDiligenceRole[] — see the note on that type. The
  // known roles are the ones the gate can act on; an unrecognised one from a
  // newer backend arrives intact and matches nothing.
  roles: string[];
}

// The ONE way to ask whether a caller holds a due-diligence role. No
// separate "isAdmin" flag anywhere in this feature — "adminRole" is just one
// more entry in `roles`, checked the same way as every other role.
export function hasDueDiligenceRole(
  me: UserInfoResponse | undefined,
  role: DueDiligenceRole,
): boolean {
  if (!me) return false;
  return me.roles.includes(role);
}
