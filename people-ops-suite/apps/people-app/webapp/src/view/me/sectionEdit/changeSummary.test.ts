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

import {
  ContinuousServiceRecordInfo,
  UpdateEmployeeJobInfoPayload,
} from "@slices/employeeSlice/employee";

import { buildChangeSummary } from "./changeSummary";

describe("buildChangeSummary — continuous service record", () => {
  const org = {
    businessUnits: [],
    teams: [],
    subTeams: [],
    units: [],
    designations: [],
    companies: [],
    offices: [],
    employmentTypes: [],
    houses: [],
  } as unknown as Parameters<typeof buildChangeSummary>[2];

  const priorRecord = (
    id: number,
    employeeId: string,
  ): ContinuousServiceRecordInfo => ({
    id,
    employeeId,
    firstName: "Test",
    lastName: "Person",
    workLocation: "Testland",
    startDate: "2021-01-01",
    employeeStatus: "Left",
    managerEmail: "lead@example.invalid",
    designation: "Example Designation",
    company: "Example Company",
    businessUnit: "Example Business Unit",
    team: "Example Team",
    subTeam: null,
  });

  const serviceRecords = [
    priorRecord(4821, "DE100007"),
    priorRecord(5102, "LK100002"),
  ];

  const before = {
    continuousServiceRecord: null,
  } as UpdateEmployeeJobInfoPayload;

  it("shows the linked employment as its Employee ID, not its employee.id", () => {
    const rows = buildChangeSummary(
      { continuousServiceRecord: 4821 },
      before,
      org,
      [],
      serviceRecords,
    );

    expect(rows).toEqual([
      { label: "Continuous Service Record", from: "—", to: "DE100007" },
    ]);
  });

  it("resolves both sides when the link moves to another employment", () => {
    const rows = buildChangeSummary(
      { continuousServiceRecord: 5102 },
      { continuousServiceRecord: 4821 } as UpdateEmployeeJobInfoPayload,
      org,
      [],
      serviceRecords,
    );

    expect(rows).toEqual([
      {
        label: "Continuous Service Record",
        from: "DE100007",
        to: "LK100002",
      },
    ]);
  });

  it("shows the clear sentinel as an empty value", () => {
    const rows = buildChangeSummary(
      { continuousServiceRecord: -1 },
      { continuousServiceRecord: 4821 } as UpdateEmployeeJobInfoPayload,
      org,
      [],
      serviceRecords,
    );

    expect(rows).toEqual([
      { label: "Continuous Service Record", from: "DE100007", to: "—" },
    ]);
  });

  it("falls back to the raw id when the record is not loaded", () => {
    const rows = buildChangeSummary(
      { continuousServiceRecord: 9999 },
      before,
      org,
      [],
    );

    expect(rows).toEqual([
      { label: "Continuous Service Record", from: "—", to: "9999" },
    ]);
  });
});
