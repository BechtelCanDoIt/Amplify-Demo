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

import { EmployeeStatus } from "@/types/types";
import { ContinuousServiceRecordInfo } from "@slices/employeeSlice/employee";

import {
  isEligiblePriorEmployment,
  isStaleContinuousServiceLink,
} from "./continuousService";

const record = (
  employeeId: string,
  startDate: string,
  employeeStatus: string,
): ContinuousServiceRecordInfo => ({
  id: 14501,
  employeeId,
  firstName: "Test",
  lastName: "Person",
  workLocation: "Testland",
  startDate,
  employeeStatus,
  managerEmail: "lead@example.invalid",
  designation: "Example Designation",
  company: "Example Company",
  businessUnit: "Example Business Unit",
  team: "Example Team",
  subTeam: null,
});

describe("isEligiblePriorEmployment", () => {
  it("offers an earlier employment that has ended", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK100254", "2012-09-01", EmployeeStatus.Left),
        "2020-01-01",
        "LK101111",
      ),
    ).toBe(true);
  });

  it("does not offer a later employment, so the old record cannot link forwards", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK101111", "2020-01-01", EmployeeStatus.Left),
        "2012-09-01",
        "LK100254",
      ),
    ).toBe(false);
  });

  it("does not offer an employment starting the same day", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK100254", "2020-01-01", EmployeeStatus.Left),
        "2020-01-01",
      ),
    ).toBe(false);
  });

  it("does not offer an employment that has not ended", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK100254", "2012-09-01", EmployeeStatus.Active),
        "2020-01-01",
      ),
    ).toBe(false);
    expect(
      isEligiblePriorEmployment(
        record("LK100254", "2012-09-01", EmployeeStatus.NewJoiner),
        "2020-01-01",
      ),
    ).toBe(false);
  });

  it("offers a Marked leaver employment, so a relocation can be linked", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK100254", "2012-09-01", EmployeeStatus.MarkedLeaver),
        "2020-01-01",
      ),
    ).toBe(true);
  });

  it("never offers the record being edited", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK101111", "2012-09-01", EmployeeStatus.Left),
        "2020-01-01",
        "LK101111",
      ),
    ).toBe(false);
  });

  it.each(["0002-10-01", "0020-10-01", "0202-10-01", "Invalid Date", "2026-1"])(
    "ignores the half-typed start date %s, keeping the record offered",
    (partial) => {
      expect(
        isEligiblePriorEmployment(
          record("LK100998", "2019-01-01", EmployeeStatus.Left),
          partial,
        ),
      ).toBe(true);
    },
  );

  it("still rules a record out once a complete earlier start date is entered", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK100998", "2019-01-01", EmployeeStatus.Left),
        "2010-01-01",
      ),
    ).toBe(false);
  });

  it("leaves the date to the backend while no start date is entered", () => {
    expect(
      isEligiblePriorEmployment(
        record("LK100254", "2012-09-01", EmployeeStatus.Left),
        "",
      ),
    ).toBe(true);
  });
});

describe("isStaleContinuousServiceLink", () => {
  const earlier = {
    ...record("LK100254", "2012-09-01", EmployeeStatus.Left),
    id: 14501,
  };

  it("is stale once the selected record is no longer offered", () => {
    // e.g. the start date moved to before the selected record's start
    expect(isStaleContinuousServiceLink([], 14501)).toBe(true);
  });

  it("is not stale while the selected record is still offered", () => {
    expect(isStaleContinuousServiceLink([earlier], 14501)).toBe(false);
  });

  it("is not stale when nothing is selected", () => {
    expect(isStaleContinuousServiceLink([], null)).toBe(false);
    expect(isStaleContinuousServiceLink([earlier], undefined)).toBe(false);
  });
});

