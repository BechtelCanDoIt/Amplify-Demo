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

import { CareerFunction, Designation } from "@slices/careerFunctionSlice/careerFunction";

/**
 * Mirrors the `uk_active_designation_per_career_function` database index:
 * within one career function, no two ACTIVE designations may share a name,
 * compared case-insensitively and whitespace-trimmed. Unassigned designations
 * (careerFunctionId === null) form their own group.
 *
 * This is a convenience check so the dialog can show an inline error; the
 * database index remains the real guard against races.
 */
export function isDuplicateDesignationName(
  name: string,
  careerFunctionId: number | null,
  designations: Designation[],
  excludeId?: number,
): boolean {
  const candidate = name.trim().toLowerCase();
  if (!candidate) return false;

  return designations.some(
    (d) =>
      d.isActive &&
      d.id !== excludeId &&
      d.careerFunctionId === careerFunctionId &&
      d.designation.trim().toLowerCase() === candidate,
  );
}

/**
 * Mirrors the `uk_career_function_name` database index: a career function name is
 * unique across the WHOLE table, compared case-insensitively and whitespace-trimmed.
 *
 * Note this is deliberately stricter than the designation rule above, which only
 * covers active rows. Here inactive career functions still hold their name — a
 * retired career function is reactivated rather than recreated.
 *
 * This is a convenience check so the dialog can show an inline error; the database
 * index remains the real guard against races.
 */
export function isDuplicateCareerFunctionName(
  name: string,
  careerFunctions: CareerFunction[],
  excludeId?: number,
): boolean {
  const candidate = name.trim().toLowerCase();
  if (!candidate) return false;

  return careerFunctions.some(
    (cf) => cf.id !== excludeId && cf.careerFunction.trim().toLowerCase() === candidate,
  );
}
