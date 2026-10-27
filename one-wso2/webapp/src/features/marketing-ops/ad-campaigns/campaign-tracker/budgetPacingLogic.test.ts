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

import { describe, expect, it, vi } from "vitest";
import type { PacingLine, SyncCell } from "./budgetSyncTypes";
import {
  attributeLines,
  computeCapacity,
  computeIntegrity,
  computeSlice,
  crossValues,
  daysInMonth,
  defaultDay,
  gapTone,
  judge,
  sumSlices,
  utilBucket,
  utilOf,
} from "./budgetPacingLogic";
import { attributeCampaignName } from "./pacingAttribution";

const amounts = (month: number, value: number): number[] => {
  const a = new Array<number>(12).fill(0);
  a[month] = value;
  return a;
};

const cell = (over: Partial<SyncCell>): SyncCell => ({
  unit: "u",
  tab_label: "Integration",
  side: "BU",
  region: "EU",
  bu: "Integration",
  is_buffer: false,
  amounts: new Array<number>(12).fill(0),
  ...over,
});

const line = (over: Partial<PacingLine>): PacingLine => ({
  id: "1",
  campaign_name: "EU_Integration | Generic | Feb26_BU",
  platform: "Google Ads",
  status: "ENABLED",
  live: true,
  daily_budget: 100,
  daily_budget_is_derived: false,
  mtd_spend: 0,
  clicks: 0,
  ...over,
});

describe("attributeCampaignName", () => {
  it("reads region, BU and side from a BU-side name", () => {
    expect(attributeCampaignName("EU_Integration | Integrator Generic | Feb26_BU")).toEqual({
      side: "BU",
      tab: "Integration",
      region: "EU",
      bu: "Integration",
    });
  });

  it("maps a Regional-side name to the regional tab, with ANZ rolling up under APAC", () => {
    const a = attributeCampaignName("ANZ_IAM | Thing | Mar26_Regional");
    expect(a).toMatchObject({ side: "Regional", tab: "APAC", region: "APAC", bu: "IAM" });
  });

  it("matches prefix codes case-insensitively and keeps GLOBAL's canonical casing", () => {
    expect(attributeCampaignName("Global_Corporate | x | Sep26_BU")).toMatchObject({
      tab: "Corporate",
      region: "GLOBAL",
    });
  });

  it("rolls Healthcare up under Solutions and Choreo under the Integration tab", () => {
    expect(attributeCampaignName("NA_Healthcare | x | Jan26_BU")).toMatchObject({ tab: "Solutions", bu: "Solutions" });
    expect(attributeCampaignName("NA_Choreo | x | Jan26_BU")).toMatchObject({ tab: "Integration", bu: "Choreo" });
  });

  it("attributes anything unparseable to Unmapped instead of guessing", () => {
    expect(attributeCampaignName("some random campaign")).toEqual({
      side: "Unclassified",
      tab: "Unmapped",
      region: "Unmapped",
      bu: "Unmapped",
    });
    expect(attributeCampaignName(null).tab).toBe("Unmapped");
  });
});

describe("dates", () => {
  it("counts days in a month, leap years included", () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 11)).toBe(31);
  });

  it("defaults to the last day for a month that isn't the current one", () => {
    expect(defaultDay(2001, 1)).toBe(28);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 4, 17, 12));
      expect(defaultDay(2026, 4)).toBe(17);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("judge", () => {
  // 31-day month, day 10: pro-rata budget of 1000 is 1000 * 10/31 ≈ 322.58
  it("is On track within ±10% of the pro-rata budget", () => {
    expect(judge(1000, 322.58, 0, 10, 31)).toMatchObject({ key: "ok", tone: "green" });
    expect(judge(1000, 300, 0, 10, 31).key).toBe("ok");
  });

  it("is Behind below 90% and Ahead above 110% of pace", () => {
    expect(judge(1000, 200, 0, 10, 31)).toMatchObject({ key: "behind", tone: "amber" });
    expect(judge(1000, 400, 0, 10, 31)).toMatchObject({ key: "ahead", tone: "purple" });
  });

  it("doesn't pace a buffer-only or empty line", () => {
    expect(judge(0, 0, 500, 10, 31)).toMatchObject({ key: "none", pace: null, label: "Buffer only, not paced" });
    expect(judge(0, 0, 0, 10, 31).label).toBe("No activity");
  });

  it("flags spend with no budget", () => {
    expect(judge(0, 50, 0, 10, 31)).toMatchObject({ key: "nb", label: "Spending with no budget" });
    expect(judge(0, 50, 100, 10, 31).label).toBe("Spending against buffer only");
  });
});

describe("gapTone", () => {
  it("is amber while money is left, purple when overspent or unbudgeted, green when exact", () => {
    expect(gapTone(100, 10)).toBe("amber");
    expect(gapTone(100, -10)).toBe("purple");
    expect(gapTone(0, 10)).toBe("purple");
    expect(gapTone(100, 0)).toBe("green");
  });
});

describe("computeSlice", () => {
  const month = 1; // February, 28 days
  const cells = [
    cell({ amounts: amounts(month, 2800) }),
    cell({ amounts: amounts(month, 700), is_buffer: true }),
    cell({ tab_label: "IAM", bu: "IAM", amounts: amounts(month, 999) }),
  ];
  const lines = attributeLines([
    line({ id: "a", mtd_spend: 400 }),
    line({ id: "b", mtd_spend: 100, live: false, daily_budget: 50 }),
    line({ id: "c", campaign_name: "EU_IAM | x | Feb26_BU", mtd_spend: 7 }),
  ]);

  it("keeps buffer out of the budget but reports it separately", () => {
    const s = computeSlice(cells, lines, "Integration", "all", month, 14, 28);
    expect(s.budget).toBe(2800);
    expect(s.buffer).toBe(700);
  });

  it("derives spend, run-rate, needs, gap and projected landing", () => {
    const s = computeSlice(cells, lines, "Integration", "all", month, 14, 28);
    expect(s.spend).toBe(500);
    expect(s.using).toBeCloseTo(500 / 14);
    expect(s.needs).toBeCloseTo((2800 - 500) / 14);
    expect(s.gap).toBe(2300);
    expect(s.landing).toBeCloseTo(500 + (500 / 14) * 14);
  });

  it("only counts live lines toward the daily cap", () => {
    expect(computeSlice(cells, lines, "Integration", "all", month, 14, 28).cap).toBe(100);
  });

  it("needs/day is zero once the month is over", () => {
    expect(computeSlice(cells, lines, "Integration", "all", month, 28, 28).needs).toBe(0);
  });

  it("scopes to a sub-filter value", () => {
    const eu = computeSlice(cells, lines, "Integration", "EU", month, 14, 28);
    const na = computeSlice(cells, lines, "Integration", "NA", month, 14, 28);
    expect(eu.spend).toBe(500);
    expect(na.spend).toBe(0);
  });

  it("ALL spans every known tab and sumSlices agrees with it", () => {
    const all = computeSlice(cells, lines, "ALL", "all", month, 14, 28);
    const parts = ["Integration", "IAM"].map((t) => computeSlice(cells, lines, t, "all", month, 14, 28));
    const summed = sumSlices(parts, 14, 28);
    expect(all.budget).toBe(2800 + 999);
    expect(summed.budget).toBe(all.budget);
    expect(summed.spend).toBe(all.spend);
    expect(summed.landing).toBeCloseTo(all.landing);
  });

  it("lists only cross values that carry budget or spend", () => {
    expect(crossValues(cells, lines, "Integration", month)).toEqual(["EU"]);
  });
});

describe("utilization and capacity", () => {
  const live = attributeLines([line({ mtd_spend: 1000, daily_budget: 100 })])[0];
  it("is spend/day over the daily cap, null when not live or uncapped", () => {
    expect(utilOf(live, 10)).toBeCloseTo(1);
    expect(utilOf({ ...live, live: false }, 10)).toBeNull();
    expect(utilOf({ ...live, daily_budget: null }, 10)).toBeNull();
  });

  it("buckets at the 95% threshold", () => {
    expect(utilBucket(live, 10)).toMatch(/^Near\/at cap/);
    expect(utilBucket({ ...live, mtd_spend: 500 }, 10)).toBe("Under cap (≤95%)");
    expect(utilBucket({ ...live, live: false }, 10)).toBe("No cap / not live");
  });

  it("bands platform utilization", () => {
    const rows = computeCapacity(
      attributeLines([
        line({ id: "1", platform: "Google Ads", mtd_spend: 1200, daily_budget: 100 }), // 120%
        line({ id: "2", platform: "LinkedIn", mtd_spend: 1000, daily_budget: 100 }), // 100%
        line({ id: "3", platform: "Other", mtd_spend: 100, daily_budget: 100 }), // 10%
      ]),
      10,
    );
    const band = (p: string) => rows.find((r) => r.platform === p)?.band;
    expect(band("Google Ads")).toBe("soft");
    expect(band("LinkedIn")).toBe("ok");
    expect(band("Other")).toBe("delivery-capped");
  });
});

describe("computeIntegrity", () => {
  const cells = [cell({ is_buffer: true, amounts: amounts(1, 250) })];

  it("passes when every campaign maps and totals reconcile", () => {
    const checks = computeIntegrity(cells, attributeLines([line({ mtd_spend: 10 })]), 1);
    expect(checks[0].ok).toBe(true);
    // Informational row: true by construction, so it carries no pass/fail.
    expect(checks[1].ok).toBeNull();
    expect(checks[2].detail).toContain("$250");
  });

  it("fails when an unmapped campaign carries spend, and lists it", () => {
    const checks = computeIntegrity(
      cells,
      attributeLines([line({ id: "x", campaign_name: "mystery", mtd_spend: 330 })]),
      1,
    );
    expect(checks[0].ok).toBe(false);
    expect(checks[0].drilldown).toEqual([{ name: "mystery", spend: 330 }]);
  });

  it("is informational, not failing, when unmapped campaigns spent nothing", () => {
    const checks = computeIntegrity(cells, attributeLines([line({ campaign_name: "mystery", mtd_spend: 0 })]), 1);
    expect(checks[0].ok).toBeNull();
    expect(checks[0].drilldown).toBeUndefined();
  });
});
