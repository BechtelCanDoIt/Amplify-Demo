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
import { filterAdditionalReports } from "./parAdditionalReports";
import type { ParAdditionalReport } from "../api/types";

function report(overrides: Partial<ParAdditionalReport>): ParAdditionalReport {
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
    parDirectLead: "lead@wso2.com",
    reportingType: "indirect",
    ...overrides,
  };
}

describe("filterAdditionalReports", () => {
  it("keeps only indirect reports", () => {
    const rows = [report({ reportingType: "direct" }), report({ reportingType: "indirect" })];
    expect(filterAdditionalReports(rows, "")).toHaveLength(1);
    expect(filterAdditionalReports(rows, "")[0].reportingType).toBe("indirect");
  });

  it("matches the search term against email, not name", () => {
    const rows = [report({ parEmployeeEmail: "jane@wso2.com", parEmployeeName: "Jane Doe" })];
    expect(filterAdditionalReports(rows, "jane")).toHaveLength(1);
    expect(filterAdditionalReports(rows, "Doe")).toHaveLength(0);
  });

  it("is case-insensitive on both filters", () => {
    const rows = [report({ reportingType: "INDIRECT", parEmployeeEmail: "Jane@WSO2.com" })];
    expect(filterAdditionalReports(rows, "JANE")).toHaveLength(1);
  });

  it("returns an empty array when nothing matches", () => {
    const rows = [report({})];
    expect(filterAdditionalReports(rows, "nobody")).toEqual([]);
  });
});
