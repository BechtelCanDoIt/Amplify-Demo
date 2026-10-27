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
import { filterChainReports, isEmployeeALead } from "./parReportChain";
import type { ParChainReport } from "../api/types";

function report(overrides: Partial<ParChainReport>): ParChainReport {
  return {
    parRatingId: 1,
    parCycleId: 1,
    parEmployeeEmail: "jane@wso2.com",
    parEmployeeName: "Jane Doe",
    parTeamId: 1,
    parEmployeeStatus: "PENDING",
    parLeadStatus: "PENDING",
    par360ReviewStatus: "PENDING",
    par360ReviewCounts: { requestedReviewCount: 0, sharedReviewCount: 0 },
    parF2fStatus: "PENDING",
    parTeam: "Core",
    parSubTeam: "",
    parLeadEmail: "lead@wso2.com",
    parDepartment: "Engineering",
    parBusinessUnit: "Platform",
    isEmployeeALead: "False",
    ...overrides,
  };
}

describe("filterChainReports", () => {
  it("matches the search term against email, not name", () => {
    const rows = [report({ parEmployeeEmail: "jane@wso2.com", parEmployeeName: "Jane Doe" })];
    expect(filterChainReports(rows, "jane", false)).toHaveLength(1);
    expect(filterChainReports(rows, "Doe", false)).toHaveLength(0);
  });

  it("keeps every row when showLeadsOnly is false, regardless of case", () => {
    const rows = [report({ isEmployeeALead: "False" }), report({ isEmployeeALead: "True" })];
    expect(filterChainReports(rows, "", false)).toHaveLength(2);
  });

  it("keeps only leads when showLeadsOnly is true", () => {
    const rows = [report({ isEmployeeALead: "False" }), report({ isEmployeeALead: "True" })];
    const filtered = filterChainReports(rows, "", true);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].isEmployeeALead).toBe("True");
  });

  it("is case-insensitive on the leads-only comparison", () => {
    const rows = [report({ isEmployeeALead: "true" })];
    expect(filterChainReports(rows, "", true)).toHaveLength(1);
  });

  it("combines the search and leads-only filters", () => {
    const rows = [
      report({ parEmployeeEmail: "jane@wso2.com", isEmployeeALead: "True" }),
      report({ parEmployeeEmail: "jane@wso2.com", isEmployeeALead: "False" }),
      report({ parEmployeeEmail: "amy@wso2.com", isEmployeeALead: "True" }),
    ];
    expect(filterChainReports(rows, "jane", true)).toHaveLength(1);
  });
});

describe("isEmployeeALead", () => {
  it("is case-insensitive", () => {
    expect(isEmployeeALead(report({ isEmployeeALead: "True" }))).toBe(true);
    expect(isEmployeeALead(report({ isEmployeeALead: "true" }))).toBe(true);
    expect(isEmployeeALead(report({ isEmployeeALead: "False" }))).toBe(false);
  });
});
