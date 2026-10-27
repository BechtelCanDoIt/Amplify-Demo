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
import { groupSpecialRatingAllocations } from "./parSpecialRatingAllocation";
import type { ParSpecialRatingAllocation } from "../api/types";

function row(overrides: Partial<ParSpecialRatingAllocation>): ParSpecialRatingAllocation {
  return {
    parBusinessUnit: "Engineering",
    parDepartment: "Platform",
    parTeam: "Core",
    parQuotaId: 1,
    parSpecialQuotaName: "Engineering Quota",
    parTop5Quota: 2,
    parTop20Quota: 5,
    ...overrides,
  };
}

describe("groupSpecialRatingAllocations", () => {
  it("groups rows sharing a quota id under one entry", () => {
    const groups = groupSpecialRatingAllocations(
      [row({ parTeam: "Core" }), row({ parTeam: "Infra" })],
      "",
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].departments).toHaveLength(2);
    expect(groups[0].quotaName).toBe("Engineering Quota");
    expect(groups[0].top5Quota).toBe(2);
    expect(groups[0].top20Quota).toBe(5);
  });

  it("keeps different quota ids as separate groups", () => {
    const groups = groupSpecialRatingAllocations(
      [row({ parQuotaId: 1 }), row({ parQuotaId: 2, parSpecialQuotaName: "Sales Quota" })],
      "",
    );
    expect(groups.map((g) => g.quotaId).sort()).toEqual([1, 2]);
  });

  it("marks no rows as highlighted with an empty search term", () => {
    const groups = groupSpecialRatingAllocations([row({})], "");
    expect(groups[0].departments[0].highlight).toBe(false);
  });

  it("highlights a row matching the business unit, department, or team", () => {
    const groups = groupSpecialRatingAllocations(
      [row({ parTeam: "Core" }), row({ parTeam: "Infra" })],
      "infra",
    );
    const [core, infra] = groups[0].departments;
    expect(core.highlight).toBe(false);
    expect(infra.highlight).toBe(true);
  });

  it("is case-insensitive and trims the search term", () => {
    const groups = groupSpecialRatingAllocations([row({ parBusinessUnit: "Engineering" })], "  ENGINEERING  ");
    expect(groups[0].departments[0].highlight).toBe(true);
  });

  it("returns an empty array for no rows", () => {
    expect(groupSpecialRatingAllocations([], "anything")).toEqual([]);
  });
});
