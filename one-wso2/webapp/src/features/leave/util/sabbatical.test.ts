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
  eligibilityGapDays,
  eligibilityYears,
  exceedsMaxDuration,
  isEligible,
  jobBandBlock,
  maxDurationWeeks,
  requestedDurationDays,
} from "./sabbatical";

const d = (iso: string) => new Date(`${iso}T00:00:00`);

// The config carries days; every message speaks in years and weeks.
describe("turning the configured days into the words the user sees", () => {
  it("reads 2555 days as 7 years", () => {
    expect(eligibilityYears(2555)).toBe(7);
  });

  it("reads 42 days as 6 weeks", () => {
    expect(maxDurationWeeks(42)).toBe(6);
  });

  it("keeps one decimal, as the source does", () => {
    // parseFloat((d / 365).toFixed(1)) — 1200/365 is 3.287..., shown as 3.3.
    expect(eligibilityYears(1200)).toBe(3.3);
    expect(eligibilityYears(730)).toBe(2);
  });

  it("does not round the weeks", () => {
    // A plain divide, so a value that is not a whole number of weeks shows as
    // a fraction rather than being tidied up.
    expect(maxDurationWeeks(45)).toBeCloseTo(6.428, 2);
  });
});

// A plain difference, matching the leave backend's check, so the first day
// the server accepts is also the first day the form accepts.
describe("the eligibility gap", () => {
  it("counts the whole days between the dates", () => {
    expect(eligibilityGapDays(d("2026-01-01"), d("2026-01-11"))).toBe(10);
  });

  it("is negative when the start is before the anchor", () => {
    expect(eligibilityGapDays(d("2026-01-11"), d("2026-01-01"))).toBe(-10);
  });

  it("ignores the time of day on either end", () => {
    const anchor = new Date("2026-01-01T23:59:00");
    const start = new Date("2026-01-11T00:01:00");
    expect(eligibilityGapDays(anchor, start)).toBe(10);
  });
});

describe("eligibility at the boundary", () => {
  const anchor = d("2019-01-01");

  // 7 × 365 = 2555 days. The span covers two leap days (2020, 2024), so the
  // boundary falls on 2025-12-30, two days before the seventh anniversary.
  it("is not met the day before", () => {
    expect(isEligible(anchor, d("2025-12-29"), 2555)).toBe(false);
  });

  it("is met on the day the gap reaches the limit", () => {
    expect(isEligible(anchor, d("2025-12-30"), 2555)).toBe(true);
  });

  it("stays met after it", () => {
    expect(isEligible(anchor, d("2026-06-01"), 2555)).toBe(true);
  });
});

describe("the job band", () => {
  it("blocks someone with no band recorded", () => {
    expect(jobBandBlock(null, 5)).toBe("missing");
  });

  it("blocks a band below the minimum", () => {
    expect(jobBandBlock(4, 5)).toBe("below");
  });

  it("allows the minimum band", () => {
    expect(jobBandBlock(5, 5)).toBeNull();
  });

  it("allows a band above the minimum", () => {
    expect(jobBandBlock(8, 5)).toBeNull();
  });
});

describe("the requested duration", () => {
  it("counts a single day as one", () => {
    expect(requestedDurationDays(d("2026-03-02"), d("2026-03-02"))).toBe(1);
  });

  it("includes both ends", () => {
    expect(requestedDurationDays(d("2026-03-02"), d("2026-03-04"))).toBe(3);
  });

  it("survives a daylight-saving boundary", () => {
    // Europe springs forward on 2026-03-29. A naive hour-based divide would
    // return 6.958 and floor to 6.
    expect(requestedDurationDays(d("2026-03-27"), d("2026-04-02"))).toBe(7);
  });
});

describe("the maximum duration", () => {
  it("allows exactly the limit", () => {
    // 42 days inclusive: 2026-03-02 through 2026-04-12.
    expect(exceedsMaxDuration(d("2026-03-02"), d("2026-04-12"), 42)).toBe(false);
  });

  it("refuses one day more", () => {
    expect(exceedsMaxDuration(d("2026-03-02"), d("2026-04-13"), 42)).toBe(true);
  });
});
