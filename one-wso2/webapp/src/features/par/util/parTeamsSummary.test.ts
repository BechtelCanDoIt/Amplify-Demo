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
import { calculateTeamsCompletionTotals } from "./parTeamsSummary";
import type { ParTeamSummary } from "../api/types";

function team(overrides: Partial<ParTeamSummary> = {}): ParTeamSummary {
  return {
    parTeamId: 1,
    parCycleId: 1,
    parBusinessUnit: "Engineering",
    parDepartment: "Platform",
    numberOfTeamMembers: 5,
    numberOf5pSlots: 1,
    numberOf20pSlots: 1,
    available5pSlots: 1,
    available20pSlots: 1,
    summary: { employeeParCompletedCount: 2, leadsReviewCompletedCount: 1, f2fCompletedCount: 0 },
    ...overrides,
  };
}

describe("calculateTeamsCompletionTotals", () => {
  it("sums a single team's own counts", () => {
    expect(calculateTeamsCompletionTotals([team()])).toEqual({
      totalEmployees: 5,
      totalEmployeeParComplete: 2,
      totalLeadReviewComplete: 1,
      totalF2fComplete: 0,
    });
  });

  it("sums across several teams a lead owns", () => {
    const teams = [
      team({ parTeamId: 1, numberOfTeamMembers: 5, summary: { employeeParCompletedCount: 2, leadsReviewCompletedCount: 1, f2fCompletedCount: 0 } }),
      team({ parTeamId: 2, numberOfTeamMembers: 3, summary: { employeeParCompletedCount: 3, leadsReviewCompletedCount: 0, f2fCompletedCount: 1 } }),
    ];
    expect(calculateTeamsCompletionTotals(teams)).toEqual({
      totalEmployees: 8,
      totalEmployeeParComplete: 5,
      totalLeadReviewComplete: 1,
      totalF2fComplete: 1,
    });
  });

  it("is all zero for no teams", () => {
    expect(calculateTeamsCompletionTotals([])).toEqual({
      totalEmployees: 0,
      totalEmployeeParComplete: 0,
      totalLeadReviewComplete: 0,
      totalF2fComplete: 0,
    });
  });
});
