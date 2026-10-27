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
import { calculateCycleActiveStep } from "./parCycleActiveStep";

const cycle = {
  parEmployeeDeadline: "2026-03-10",
  parLeadDeadline: "2026-03-20",
  parSpecialRatingDeadline: "2026-03-25",
  parEvaluationEndDate: "2026-03-31",
};

// `now` is always local midnight of the stated day (a bare "YYYY-MM-DD"
// parses as UTC, not local, which would reintroduce the exact mismatch
// calculateCycleActiveStep itself is guarded against — see its own
// daysSince). The suite already runs under America/Los_Angeles (see
// src/test/setup.ts), so this also exercises the fix on every run.
function localMidnight(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

describe("calculateCycleActiveStep", () => {
  it("is step 0 before any deadline", () => {
    expect(calculateCycleActiveStep(cycle, localMidnight("2026-03-01"))).toBe(0);
  });

  it("advances to step 1 once the employee deadline passes", () => {
    expect(calculateCycleActiveStep(cycle, localMidnight("2026-03-11"))).toBe(1);
  });

  it("advances to step 2 only once a full day has passed since the lead deadline (source's own off-by-one grace)", () => {
    // On the deadline's own day, the "- 1" keeps this at step 1 still.
    expect(calculateCycleActiveStep(cycle, localMidnight("2026-03-20"))).toBe(1);
    // A full day later, it advances — unlike the other three checks, which
    // advance on the deadline's own day.
    expect(calculateCycleActiveStep(cycle, localMidnight("2026-03-21"))).toBe(2);
  });

  it("advances to step 3 once the special-rating deadline passes", () => {
    expect(calculateCycleActiveStep(cycle, localMidnight("2026-03-26"))).toBe(3);
  });

  it("advances to step 4 once the cycle ends", () => {
    expect(calculateCycleActiveStep(cycle, localMidnight("2026-04-01"))).toBe(4);
  });

  it("never advances on account of a missing special-rating deadline", () => {
    const noSpecialRating = { ...cycle, parSpecialRatingDeadline: undefined };
    // Employee + lead deadlines have both passed by 03-26 (step 2), but
    // there's no special-rating deadline to advance to step 3 for.
    expect(calculateCycleActiveStep(noSpecialRating, localMidnight("2026-03-26"))).toBe(2);
  });

  // `new Date("YYYY-MM-DD")` parses as UTC midnight; in a negative UTC
  // offset (the suite's own America/Los_Angeles) that instant falls on the
  // previous local evening, which used to make a deadline read as "passed"
  // hours before it locally was. These pin the exact boundary, in UTC, so
  // they don't depend on the suite's default timezone happening to be one
  // that reproduces the bug.
  describe("across the deadline's own local-midnight boundary", () => {
    it("does not advance the instant before the employee deadline's local midnight", () => {
      // 2026-03-10T06:00:00Z is 2026-03-09T22:00:00 in Los Angeles (PDT,
      // UTC-7) — still the evening before, locally.
      const now = new Date(Date.UTC(2026, 2, 10, 6, 0, 0));
      expect(calculateCycleActiveStep(cycle, now)).toBe(0);
    });

    it("advances at the employee deadline's own local midnight", () => {
      // 2026-03-10T07:00:00Z is 2026-03-10T00:00:00 in Los Angeles.
      const now = new Date(Date.UTC(2026, 2, 10, 7, 0, 0));
      expect(calculateCycleActiveStep(cycle, now)).toBe(1);
    });
  });
});
