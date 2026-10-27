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

import { describe, it, expect } from "vitest";
import {
  emptyOpdHistoryFilters,
  hasActiveOpdFilters,
  opdActivitySteps,
  opdYearBounds,
  toOpdSearchPayload,
  type OpdHistoryFilters,
} from "./opdHistoryTypes";
import { historyDate, parseUtcTimestamp } from "./opdHistoryFormat";
import type { OpdClaim, OpdClaimStatus } from "../opdTypes";

const NOW = new Date("2026-09-18T00:00:00Z");
const base = (over: Partial<OpdHistoryFilters> = {}): OpdHistoryFilters => ({
  ...emptyOpdHistoryFilters(NOW),
  ...over,
});

function claim(status: OpdClaimStatus | null, over: Partial<OpdClaim["statusDetails"]> = {}): OpdClaim {
  return {
    id: "OPD-1",
    employeeEmail: "someone@wso2.com",
    createdDate: "2026-09-17 03:54:47.0",
    totalAmount: 100,
    transactions: [],
    statusDetails: {
      status,
      financeApproverEmail: null,
      financeApprovedDate: null,
      financeRejectedDate: null,
      financeRejectedReason: null,
      ...over,
    },
  };
}

describe("which years a period covers", () => {
  it("defaults to this year", () => {
    expect(opdYearBounds(base(), NOW)).toEqual({ startYear: 2026, endYear: 2026 });
  });

  it("reads last year off the clock rather than the stored years", () => {
    expect(opdYearBounds(base({ period: "last", startYear: 2000, endYear: 2000 }), NOW)).toEqual({
      startYear: 2025,
      endYear: 2025,
    });
  });

  // Either end can be picked first, so a person can legitimately choose the
  // later year before the earlier one. Ordering it here means that comes back
  // with claims rather than empty.
  it("orders a backwards custom span instead of returning nothing", () => {
    expect(opdYearBounds(base({ period: "custom", startYear: 2026, endYear: 2023 }), NOW)).toEqual({
      startYear: 2023,
      endYear: 2026,
    });
  });
});

describe("the search payload", () => {
  it("scopes the search to the signed-in person", () => {
    expect(toOpdSearchPayload(base(), "me@wso2.com", NOW)).toMatchObject({
      email: "me@wso2.com",
      startYear: 2026,
      endYear: 2026,
    });
  });

  it("asks for no status filter when none is picked", () => {
    expect(toOpdSearchPayload(base(), "me@wso2.com", NOW).status).toBeNull();
  });

  // filteredClaimsSlice.ts:82-89 — claims filed before the status was split
  // carry PENDING_OLD, and leaving it out hides them completely.
  it("asks for PENDING_OLD alongside PENDING", () => {
    expect(toOpdSearchPayload(base({ statuses: ["PENDING"] }), "me@wso2.com", NOW).status).toEqual([
      "PENDING",
      "PENDING_OLD",
    ]);
  });

  it("sends any other selection as-is", () => {
    expect(toOpdSearchPayload(base({ statuses: ["APPROVED"] }), "me@wso2.com", NOW).status).toEqual([
      "APPROVED",
    ]);
  });

  // `[""]` would ask for a claim whose id is the empty string and come back
  // with nothing — an empty box has to mean "no filter".
  it("treats a blank claim id as no filter, and trims a real one", () => {
    expect(toOpdSearchPayload(base({ claimId: "   " }), "me@wso2.com", NOW).ids).toBeNull();
    expect(toOpdSearchPayload(base({ claimId: " OPD-7 " }), "me@wso2.com", NOW).ids).toEqual(["OPD-7"]);
  });
});

describe("whether anything is narrowing the list", () => {
  it("is quiet on a fresh screen", () => {
    expect(hasActiveOpdFilters(base())).toBe(false);
  });

  it("notices each filter", () => {
    expect(hasActiveOpdFilters(base({ period: "last" }))).toBe(true);
    expect(hasActiveOpdFilters(base({ statuses: ["APPROVED"] }))).toBe(true);
    expect(hasActiveOpdFilters(base({ claimId: "OPD-7" }))).toBe(true);
  });

  it("does not count a whitespace-only claim id", () => {
    expect(hasActiveOpdFilters(base({ claimId: "  " }))).toBe(false);
  });
});

describe("the activity trail", () => {
  it("always opens with the submission", () => {
    const [first] = opdActivitySteps(claim("PENDING"));
    expect(first).toMatchObject({ label: "Claim Submission", date: "2026-09-17 03:54:47.0" });
  });

  it("leaves the review undated while it is pending", () => {
    const [, review] = opdActivitySteps(claim("PENDING"));
    expect(review).toMatchObject({ label: "Finance Review", state: "Pending", date: null });
  });

  // Same state under an older name — showing the raw value would put a word on
  // screen that means nothing to the person reading it.
  it("reads PENDING_OLD as pending", () => {
    const [, review] = opdActivitySteps(claim("PENDING_OLD"));
    expect(review.state).toBe("Pending");
  });

  it("reads a missing status as pending, as the status chip does", () => {
    expect(opdActivitySteps(claim(null))[1].state).toBe("Pending");
  });

  // A status this app has never heard of is not pending. Saying so would state
  // something about the claim that nobody told us.
  it("shows an unrecognised status as the backend sent it", () => {
    const [, review] = opdActivitySteps(claim("ESCALATED" as OpdClaimStatus));
    expect(review.state).toBe("Unknown");
    expect(review.rawStatus).toBe("ESCALATED");
  });

  it("dates an approval", () => {
    const [, review] = opdActivitySteps(
      claim("APPROVED", { financeApprovedDate: "2026-09-18 04:10:00.0" }),
    );
    expect(review).toMatchObject({ state: "Approved", date: "2026-09-18 04:10:00.0" });
  });

  it("carries finance's words on a rejection", () => {
    const [, review] = opdActivitySteps(
      claim("REJECTED", {
        financeRejectedDate: "2026-09-18 06:30:00.0",
        financeRejectedReason: "Receipt unreadable.",
      }),
    );
    expect(review).toMatchObject({ state: "Rejected", reason: "Receipt unreadable." });
  });
});

describe("dates", () => {
  // The backend sends "2026-09-17 03:54:47.0" — UTC, with a space and no zone
  // marker. THIS is the assertion that matters, and it is the one the shared
  // `formatNice` fails: it regex-matches the YYYY-MM-DD head and drops the
  // time, reading the stamp as a local calendar day. Asserted on the instant
  // rather than the rendered string because the rendering is local, and this
  // suite has to pass in every timezone CI might run in.
  it("reads the timestamp as UTC, not as a local calendar day", () => {
    expect(parseUtcTimestamp("2026-09-17 03:54:47.0")?.toISOString()).toBe(
      "2026-09-17T03:54:47.000Z",
    );
  });

  // A bare date has no time to misread, so it is built from local fields —
  // treating it as UTC midnight would shift it a day backwards for anyone west
  // of Greenwich.
  it("keeps a bare bill date on the day it says", () => {
    const d = parseUtcTimestamp("2026-09-17")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 17]);
  });

  it("renders in the source's DD-MMM-YYYY shape", () => {
    // A BARE date, not a timestamp: it is built from local fields, so it lands
    // on the day it says in every timezone. Midday UTC would have been enough
    // for most of them, but it is already 18 Sep in UTC+12 and beyond, and a
    // suite that fails in New Zealand is a suite nobody trusts. The UTC parsing
    // itself is asserted on the instant, above.
    expect(historyDate("2026-09-17")).toBe("17-Sep-2026");
  });

  // An unanchored match accepted an offset-bearing value and then threw the
  // offset away, reporting a time hours out with total confidence.
  it("refuses a timestamp carrying an offset it would have to discard", () => {
    expect(parseUtcTimestamp("2026-09-17T03:54:47+05:30")).toBeNull();
    expect(historyDate("2026-09-17T03:54:47+05:30")).toBe("—");
  });

  it("still accepts fractional seconds and a trailing Z", () => {
    expect(parseUtcTimestamp("2026-09-17 03:54:47.0")?.toISOString()).toBe(
      "2026-09-17T03:54:47.000Z",
    );
    expect(parseUtcTimestamp("2026-09-17T03:54:47Z")?.toISOString()).toBe(
      "2026-09-17T03:54:47.000Z",
    );
  });

  it("does not blank a row it cannot parse", () => {
    expect(historyDate("")).toBe("—");
    expect(historyDate(null)).toBe("—");
  });
});
