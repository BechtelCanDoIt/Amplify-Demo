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

import { LeadershipGroupWithUsage } from "@slices/leadershipSlice/leadership";

/**
 * Mirrors the `uk_leadership_group_name` index: a name is unique across every attribute,
 * retired ones included, compared case-insensitively and whitespace-trimmed.
 *
 * A convenience check so the dialog can show an inline error; the database index remains
 * the real guard against races.
 */
export function isDuplicateLeadershipAttributeName(
  name: string,
  attributes: LeadershipGroupWithUsage[],
  excludeId?: number,
): boolean {
  const candidate = name.trim().toLowerCase();
  if (!candidate) return false;
  return attributes.some(
    (a) => a.id !== excludeId && a.name.trim().toLowerCase() === candidate,
  );
}

/**
 * Whether the dialog should block retiring this attribute: only the active -> retired
 * transition is blocked, and only while current employees hold it. A retired attribute
 * can always be reactivated. The backend enforces the same rule.
 */
export function isRetireBlocked(
  attribute: LeadershipGroupWithUsage | null | undefined,
  isActiveNow: boolean,
): boolean {
  return attribute != null && isActiveNow && attribute.holderCount > 0;
}

/**
 * Mirrors the backend's name constraint: start with a letter, then only letters, digits,
 * spaces, &, -, ' and . — checked on the trimmed name.
 *
 * The name becomes a CSV column header, so starting with a letter means it can never begin
 * with =, +, - or @ and be run as a spreadsheet formula. The comma is left out because a
 * holder's attributes travel comma-joined and are split on commas.
 */
export const LEADERSHIP_ATTRIBUTE_NAME_PATTERN = /^\p{L}[\p{L}\p{M}\p{N} &'.-]*$/u;

export const LEADERSHIP_ATTRIBUTE_NAME_RULE =
  "Must start with a letter and use only letters, numbers, spaces, &, -, ' and .";

