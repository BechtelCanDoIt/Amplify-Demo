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

import { calculateServiceLength } from "./utils";

describe("calculateServiceLength", () => {
  const NOW = new Date("2026-10-01T10:30:00");

  it("counts up to now when there is no final day of employment", () => {
    expect(calculateServiceLength("2020-04-01", null, NOW)).toEqual({
      years: 6,
      months: 6,
    });
  });

  it("stops at a final day of employment in the past", () => {
    expect(calculateServiceLength("2020-04-01", "2023-06-15", NOW)).toEqual({
      years: 3,
      months: 2,
    });
  });

  it("counts the final day of employment as a day worked", () => {
    expect(calculateServiceLength("2020-04-01", "2023-03-31", NOW)).toEqual({
      years: 3,
      months: 0,
    });
    expect(calculateServiceLength("2020-12-01", "2020-12-31", NOW)).toEqual({
      years: 0,
      months: 1,
    });
  });

  it("rolls the day after the final day over year ends and leap days", () => {
    expect(calculateServiceLength("2020-01-01", "2020-12-31", NOW)).toEqual({
      years: 1,
      months: 0,
    });
    expect(calculateServiceLength("2020-03-01", "2024-02-29", NOW)).toEqual({
      years: 4,
      months: 0,
    });
  });

  it("counts today when today is the final day of employment", () => {
    expect(calculateServiceLength("2025-10-02", "2026-10-01", NOW)).toEqual({
      years: 1,
      months: 0,
    });
  });

  it("counts up to now while the final day of employment is still ahead", () => {
    expect(calculateServiceLength("2020-04-01", "2026-12-31", NOW)).toEqual({
      years: 6,
      months: 6,
    });
  });

  it("ignores a malformed final day of employment", () => {
    expect(calculateServiceLength("2020-04-01", "not-a-date", NOW)).toEqual({
      years: 6,
      months: 6,
    });
  });

  it("returns null when the final day is before the start date", () => {
    expect(calculateServiceLength("2020-04-01", "2019-01-01", NOW)).toBeNull();
  });

  it("returns null for a future start date", () => {
    expect(calculateServiceLength("2027-01-01", null, NOW)).toBeNull();
  });
});
