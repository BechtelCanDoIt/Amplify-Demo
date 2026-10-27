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

// Employment types the employee-facing Promotion screen is not for. The wire
// value is uppercase ("INTERNSHIP"); it is compared case-insensitively.
const INELIGIBLE_EMPLOYMENT_TYPES: readonly string[] = ["internship"];

/**
 * Whether Me → Promotion applies to this employee. Fails open once
 * `isPending` clears — a profile that never arrived must not hide the item
 * by itself; callers decide what a failed read means. Pass the profile
 * query's own `isPending`, not `isLoading`, which reads false while the
 * query is still waiting on identity.
 */
export function promotionEmployeeAccess(
  employmentType: string | undefined,
  isPending: boolean,
): { canSee: boolean; isLoading: boolean } {
  const type = employmentType?.toLowerCase();
  return { canSee: !(type && INELIGIBLE_EMPLOYMENT_TYPES.includes(type)), isLoading: isPending };
}
