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
import { CLAIM_TYPES, defaultClaimTab, visibleClaimTypes } from "./claimsTabs";

describe("claim types by work location", () => {
  it("offers both types in Sri Lanka", () => {
    expect(visibleClaimTypes(true).map((t) => t.segment)).toEqual(["opd", "expense"]);
  });

  // OPD is a Colombo medical-allowance scheme — there is nothing for anyone
  // else to claim against.
  it("hides OPD everywhere else", () => {
    expect(visibleClaimTypes(false).map((t) => t.segment)).toEqual(["expense"]);
  });

  // THE bug this guards. OPD is CLAIM_TYPES[0], so the old fixed default sent
  // every non-Sri-Lanka employee to a tab that is not in their tab bar.
  it("never defaults to a tab the employee cannot see", () => {
    for (const isSriLanka of [true, false]) {
      const fallback = defaultClaimTab(isSriLanka);
      expect(visibleClaimTypes(isSriLanka)).toContain(fallback);
    }
  });

  it("still lands on OPD in Sri Lanka, where it is the common case", () => {
    expect(defaultClaimTab(true).segment).toBe("opd");
  });

  // A third claim type added without deciding its location rule would silently
  // be offered everywhere. That is the safe direction, but it should be a
  // choice — this fails if the list grows so the question gets asked.
  it("covers every claim type the app defines", () => {
    expect(CLAIM_TYPES.map((t) => t.segment).sort()).toEqual(["expense", "opd"]);
  });
});
