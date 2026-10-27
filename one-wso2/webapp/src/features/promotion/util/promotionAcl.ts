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

import type { PromotionBusinessUnitAccess, PromotionDepartmentAccess } from "../api/types";

// Selection model for the Functional Lead ACL tree (User Management's own
// "which BU/Department/Team can this lead act on" picker). A leaf is a
// team; a department with no teams of its own can be selected directly
// (its key form below), same for a business unit with no departments —
// both are real shapes the backend's own tree can return.
export type PromotionAclSelection = ReadonlySet<string>;

export function teamKey(teamId: number): string {
  return `team:${teamId}`;
}
export function deptKey(deptId: number): string {
  return `dept:${deptId}`;
}
export function buKey(buId: number): string {
  return `bu:${buId}`;
}

export type TriState = "checked" | "indeterminate" | "unchecked";

export function deptState(selection: PromotionAclSelection, dept: PromotionDepartmentAccess): TriState {
  const teams = dept.teams ?? [];
  if (teams.length === 0) return selection.has(deptKey(dept.id)) ? "checked" : "unchecked";
  const selectedCount = teams.filter((t) => selection.has(teamKey(t.id))).length;
  if (selectedCount === 0) return "unchecked";
  if (selectedCount === teams.length) return "checked";
  return "indeterminate";
}

export function buState(selection: PromotionAclSelection, bu: PromotionBusinessUnitAccess): TriState {
  const depts = bu.departments ?? [];
  if (depts.length === 0) return selection.has(buKey(bu.id)) ? "checked" : "unchecked";
  const states = depts.map((d) => deptState(selection, d));
  if (states.every((s) => s === "checked")) return "checked";
  if (states.every((s) => s === "unchecked")) return "unchecked";
  return "indeterminate";
}

/** Every key a department (or, with no teams, the department itself) contributes. */
function deptKeys(dept: PromotionDepartmentAccess): string[] {
  const teams = dept.teams ?? [];
  return teams.length === 0 ? [deptKey(dept.id)] : teams.map((t) => teamKey(t.id));
}

/** Every key a business unit (or, with no departments, itself) contributes. */
function buKeys(bu: PromotionBusinessUnitAccess): string[] {
  const depts = bu.departments ?? [];
  return depts.length === 0 ? [buKey(bu.id)] : depts.flatMap((d) => deptKeys(d));
}

export function toggleTeam(selection: PromotionAclSelection, teamId: number, checked: boolean): PromotionAclSelection {
  const next = new Set(selection);
  if (checked) next.add(teamKey(teamId));
  else next.delete(teamKey(teamId));
  return next;
}

export function toggleDept(
  selection: PromotionAclSelection,
  dept: PromotionDepartmentAccess,
  checked: boolean,
): PromotionAclSelection {
  const next = new Set(selection);
  for (const key of deptKeys(dept)) {
    if (checked) next.add(key);
    else next.delete(key);
  }
  return next;
}

export function toggleBu(selection: PromotionAclSelection, bu: PromotionBusinessUnitAccess, checked: boolean): PromotionAclSelection {
  const next = new Set(selection);
  for (const key of buKeys(bu)) {
    if (checked) next.add(key);
    else next.delete(key);
  }
  return next;
}

/** Filters the full BU tree down to only what's selected — the shape
 * PromotionUserInsertPayload/PromotionUserUpdatePayload's own
 * functionalLeadAccessLevels.businessUnits expects. */
export function buildAclPayload(
  universe: PromotionBusinessUnitAccess[],
  selection: PromotionAclSelection,
): PromotionBusinessUnitAccess[] {
  const result: PromotionBusinessUnitAccess[] = [];
  for (const bu of universe) {
    const depts = bu.departments ?? [];
    if (depts.length === 0) {
      if (selection.has(buKey(bu.id))) result.push({ id: bu.id, name: bu.name });
      continue;
    }
    const selectedDepts = depts
      .map((dept) => {
        const teams = dept.teams ?? [];
        if (teams.length === 0) {
          return selection.has(deptKey(dept.id)) ? { id: dept.id, name: dept.name } : null;
        }
        const selectedTeams = teams.filter((t) => selection.has(teamKey(t.id))).map((t) => ({ id: t.id, name: t.name }));
        return selectedTeams.length > 0 ? { id: dept.id, name: dept.name, teams: selectedTeams } : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
    if (selectedDepts.length > 0) result.push({ id: bu.id, name: bu.name, departments: selectedDepts });
  }
  return result;
}

/** Reverse of buildAclPayload — seeds the selection Set from an existing
 * user's already-saved functionalLeadAccessLevels, for the Edit User form. */
export function selectionFromAcl(businessUnits: PromotionBusinessUnitAccess[] | undefined): PromotionAclSelection {
  const keys = new Set<string>();
  for (const bu of businessUnits ?? []) {
    const depts = bu.departments ?? [];
    if (depts.length === 0) {
      keys.add(buKey(bu.id));
      continue;
    }
    for (const dept of depts) {
      const teams = dept.teams ?? [];
      if (teams.length === 0) keys.add(deptKey(dept.id));
      else for (const team of teams) keys.add(teamKey(team.id));
    }
  }
  return keys;
}
