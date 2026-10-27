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

import { describe, expect, it } from "vitest";
import {
  buState,
  buildAclPayload,
  deptState,
  selectionFromAcl,
  toggleBu,
  toggleDept,
  toggleTeam,
  type PromotionAclSelection,
} from "./promotionAcl";
import type { PromotionBusinessUnitAccess, PromotionDepartmentAccess } from "../api/types";

// A two-team department, and one with no teams of its own (a real shape
// the backend's own tree can return — see promotionAcl.ts's own comment).
const engineering: PromotionDepartmentAccess = {
  id: 1,
  name: "Engineering",
  teams: [
    { id: 101, name: "Backend" },
    { id: 102, name: "Frontend" },
  ],
};
const legal: PromotionDepartmentAccess = { id: 2, name: "Legal" };

const bu: PromotionBusinessUnitAccess = {
  id: 10,
  name: "Technology Division",
  departments: [engineering, legal],
};

// A business unit with no departments of its own.
const flatBu: PromotionBusinessUnitAccess = { id: 20, name: "Marketing" };

describe("deptState", () => {
  it("is unchecked when nothing under it is selected", () => {
    expect(deptState(new Set(), engineering)).toBe("unchecked");
  });

  it("is indeterminate when only some of its teams are selected", () => {
    expect(deptState(new Set(["team:101"]), engineering)).toBe("indeterminate");
  });

  it("is checked when every one of its teams is selected", () => {
    expect(deptState(new Set(["team:101", "team:102"]), engineering)).toBe("checked");
  });

  it("reads a teamless department off its own direct key instead", () => {
    expect(deptState(new Set(), legal)).toBe("unchecked");
    expect(deptState(new Set(["dept:2"]), legal)).toBe("checked");
  });
});

describe("buState", () => {
  it("is checked only when every department under it is fully checked", () => {
    expect(buState(new Set(["team:101", "team:102", "dept:2"]), bu)).toBe("checked");
  });

  it("is indeterminate when some but not all departments are selected", () => {
    expect(buState(new Set(["team:101", "team:102"]), bu)).toBe("indeterminate");
  });

  it("is unchecked when nothing under it is selected", () => {
    expect(buState(new Set(), bu)).toBe("unchecked");
  });

  it("reads a departmentless business unit off its own direct key instead", () => {
    expect(buState(new Set(), flatBu)).toBe("unchecked");
    expect(buState(new Set(["bu:20"]), flatBu)).toBe("checked");
  });
});

describe("toggling", () => {
  it("toggleTeam adds and removes just that one key", () => {
    const selected = toggleTeam(new Set(), 101, true);
    expect(selected.has("team:101")).toBe(true);
    expect(toggleTeam(selected, 101, false).has("team:101")).toBe(false);
  });

  it("toggleDept selects every team under it in one go", () => {
    const selected = toggleDept(new Set(), engineering, true);
    expect([...selected].sort()).toEqual(["team:101", "team:102"]);
  });

  it("toggleDept on a teamless department selects its own direct key", () => {
    const selected = toggleDept(new Set(), legal, true);
    expect([...selected]).toEqual(["dept:2"]);
  });

  it("toggleBu cascades through every department's teams", () => {
    const selected = toggleBu(new Set(), bu, true);
    expect([...selected].sort()).toEqual(["dept:2", "team:101", "team:102"]);
  });

  it("unchecking a bu clears everything it cascaded onto", () => {
    const selected = toggleBu(new Set(), bu, true);
    expect(toggleBu(selected, bu, false).size).toBe(0);
  });
});

describe("buildAclPayload / selectionFromAcl round trip", () => {
  const universe = [bu, flatBu];

  it("filters the universe down to only what's selected", () => {
    const selection: PromotionAclSelection = new Set(["team:101", "bu:20"]);
    const payload = buildAclPayload(universe, selection);

    expect(payload).toEqual([
      { id: 10, name: "Technology Division", departments: [{ id: 1, name: "Engineering", teams: [{ id: 101, name: "Backend" }] }] },
      { id: 20, name: "Marketing" },
    ]);
  });

  it("omits a business unit entirely once nothing under it is selected", () => {
    expect(buildAclPayload(universe, new Set())).toEqual([]);
  });

  it("selectionFromAcl reconstructs the same selection buildAclPayload was given", () => {
    const selection: PromotionAclSelection = new Set(["team:101", "team:102", "dept:2", "bu:20"]);
    const payload = buildAclPayload(universe, selection);
    const roundTripped = selectionFromAcl(payload);
    expect([...roundTripped].sort()).toEqual([...selection].sort());
  });
});
