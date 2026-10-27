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
  actionWindow,
  isWithinDayRange,
  isWindowOpen,
  periodLabel,
} from "@features/subscriptions/util/subscriptionWindows";

// The deployed defaults, which are also the interesting cases: the opt-in
// window wraps across the month boundary (25 → 5) while the opt-out window
// does not (25 → 31).
const META = {
  optInStartDay: 25,
  optInEndDay: 5,
  optOutStartDay: 25,
  optOutEndDay: 31,
};

/** Local midday, so no timezone shift can move the day of the month. */
function on(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day, 12, 0, 0);
}

describe("isWithinDayRange", () => {
  it("treats a non-wrapping window as an inclusive range", () => {
    expect(isWithinDayRange(25, 31, 25)).toBe(true);
    expect(isWithinDayRange(25, 31, 31)).toBe(true);
    expect(isWithinDayRange(25, 31, 24)).toBe(false);
  });

  it("treats a wrapping window as a union, not an empty range", () => {
    // The bug this guards: reading 25 → 5 as `day >= 25 && day <= 5` is never
    // true, which would close the opt-in window permanently.
    expect(isWithinDayRange(25, 5, 26)).toBe(true);
    expect(isWithinDayRange(25, 5, 3)).toBe(true);
    expect(isWithinDayRange(25, 5, 5)).toBe(true);
    expect(isWithinDayRange(25, 5, 6)).toBe(false);
    expect(isWithinDayRange(25, 5, 24)).toBe(false);
  });

  it("handles a single-day window", () => {
    expect(isWithinDayRange(10, 10, 10)).toBe(true);
    expect(isWithinDayRange(10, 10, 11)).toBe(false);
  });
});

describe("isWindowOpen", () => {
  it("reads the day of the month from the supplied instant", () => {
    expect(isWindowOpen(25, 5, on(2026, 9, 28))).toBe(true);
    expect(isWindowOpen(25, 5, on(2026, 9, 12))).toBe(false);
  });
});

describe("periodLabel", () => {
  it("keeps a non-wrapping window inside one month", () => {
    // September has 30 days: the end day (31) is clamped down rather than
    // printed as a date September does not have.
    expect(periodLabel(25, 31, on(2026, 9, 12))).toBe("25 Sep to 30 Sep");
  });

  it("names the next month for a window that wraps, when today is in the first month", () => {
    expect(periodLabel(25, 5, on(2026, 9, 12))).toBe("25 Sep to 5 Oct");
  });

  it("rolls the year over at December", () => {
    expect(periodLabel(25, 5, on(2026, 12, 28))).toBe("25 Dec to 5 Jan");
  });

  it("names the PREVIOUS month as the start once today is in the wrap's tail", () => {
    // The bug this guards: a 25 -> 5 window is still open on Oct 3 (it opened
    // Sep 25), but Oct 3's own month is the window's SECOND month, not its
    // first. Reading the start month off `now` unconditionally named this
    // "25 Oct to 5 Nov" — a window that doesn't exist; the real one, still
    // open on Oct 3, is 25 Sep to 5 Oct.
    expect(periodLabel(25, 5, on(2026, 10, 3))).toBe("25 Sep to 5 Oct");
    // Day 5 itself: still the tail of the same window.
    expect(periodLabel(25, 5, on(2026, 10, 5))).toBe("25 Sep to 5 Oct");
    // Day 6: the window has closed, so this is now describing the NEXT
    // occurrence rather than the one that just ended — back to "now's own
    // month" as the start.
    expect(periodLabel(25, 5, on(2026, 10, 6))).toBe("25 Oct to 5 Nov");
  });

  it("clamps against February too, not just 30-day months", () => {
    expect(periodLabel(25, 31, on(2026, 2, 20))).toBe("25 Feb to 28 Feb");
  });
});

describe("actionWindow", () => {
  it("governs a subscriber by the opt-OUT window", () => {
    const w = actionWindow(META, true, on(2026, 9, 28));
    expect(w.action).toBe("opt out");
    expect(w.open).toBe(true);
    // September has 30 days — the configured end day (31) is clamped.
    expect(w.label).toBe("25 Sep to 30 Sep");
    // The reverse window is what the dialog offers as the way back.
    expect(w.reverseLabel).toBe("25 Sep to 5 Oct");
  });

  it("governs a non-subscriber by the opt-IN window", () => {
    const w = actionWindow(META, false, on(2026, 10, 3));
    expect(w.action).toBe("opt in");
    // Day 3 is inside the wrapped opt-in window but outside opt-out — the
    // case that proves the right window was chosen, not just any open one.
    expect(w.open).toBe(true);
    // The window that is actually open on Oct 3 opened Sep 25, not Oct 25 —
    // see periodLabel's own "wrap's tail" test for why this is the case that
    // used to name the wrong month.
    expect(w.label).toBe("25 Sep to 5 Oct");
    expect(actionWindow(META, true, on(2026, 10, 3)).open).toBe(false);
  });

  it("closes both windows mid-month", () => {
    expect(actionWindow(META, false, on(2026, 9, 12)).open).toBe(false);
    expect(actionWindow(META, true, on(2026, 9, 12)).open).toBe(false);
  });
});
