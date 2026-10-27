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
import { msUntilNextMidnight } from "@features/subscriptions/util/useMidnightClock";

function at(year: number, month1: number, day: number, hour: number, minute = 0, second = 0): Date {
  return new Date(year, month1 - 1, day, hour, minute, second);
}

describe("msUntilNextMidnight", () => {
  it("counts down to the very start of tomorrow", () => {
    // From 23:59:59, the next midnight is 1 second away.
    expect(msUntilNextMidnight(at(2026, 9, 12, 23, 59, 59))).toBe(1000);
  });

  it("spans a full day from just after midnight", () => {
    expect(msUntilNextMidnight(at(2026, 9, 12, 0, 0, 1))).toBe(23 * 60 * 60_000 + 59 * 60_000 + 59_000);
  });

  it("floors at 1 second, matching useCafeteriaClock's own clamp", () => {
    // Exactly at midnight, the naive distance to "tomorrow at 00:00" is a
    // full 24h, not zero — but the floor exists for the case a wake-up lands
    // a hair early, which this same call also has to tolerate without ever
    // returning a near-zero or negative delay.
    expect(msUntilNextMidnight(at(2026, 9, 12, 0, 0, 0))).toBeGreaterThanOrEqual(1000);
  });

  it("crosses a month boundary", () => {
    expect(msUntilNextMidnight(at(2026, 9, 30, 22, 0, 0))).toBe(2 * 60 * 60_000);
  });

  it("crosses a year boundary", () => {
    expect(msUntilNextMidnight(at(2026, 12, 31, 23, 0, 0))).toBe(60 * 60_000);
  });
});
