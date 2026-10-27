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

import { formatDaysUntil } from "./utils";

describe("formatDaysUntil", () => {
  const NOW = new Date("2026-09-09T10:30:00");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("returns null for empty input", () => {
    expect(formatDaysUntil(null)).toBeNull();
    expect(formatDaysUntil(undefined)).toBeNull();
    expect(formatDaysUntil("")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(formatDaysUntil("not-a-date")).toBeNull();
    expect(formatDaysUntil("09/09/2026")).toBeNull();
  });

  it("returns null for past dates", () => {
    expect(formatDaysUntil("2026-09-08")).toBeNull();
    expect(formatDaysUntil("2020-01-01")).toBeNull();
  });

  it("treats today as today regardless of the current time of day", () => {
    expect(formatDaysUntil("2026-09-09")).toBe("today");
  });

  it("names tomorrow rather than counting one day", () => {
    expect(formatDaysUntil("2026-09-10")).toBe("tomorrow");
  });

  it("counts calendar days for later dates", () => {
    expect(formatDaysUntil("2026-09-11")).toBe("in 2 days");
    expect(formatDaysUntil("2026-10-14")).toBe("in 35 days");
  });

  it("counts across a year boundary", () => {
    expect(formatDaysUntil("2027-01-01")).toBe("in 114 days");
  });
});
