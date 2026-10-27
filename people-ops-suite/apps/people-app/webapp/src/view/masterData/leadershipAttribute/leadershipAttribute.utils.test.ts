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

import { LeadershipGroupWithUsage } from "@slices/leadershipSlice/leadership";

import {
  LEADERSHIP_ATTRIBUTE_NAME_PATTERN,
  isDuplicateLeadershipAttributeName,
  isRetireBlocked,
} from "./leadershipAttribute.utils";

const attribute = (
  id: number,
  name: string,
  isActive = true,
  holderCount = 0,
): LeadershipGroupWithUsage => ({ id, name, isActive, holderCount });

describe("isDuplicateLeadershipAttributeName", () => {
  const attributes = [
    attribute(1, "Leadership Group"),
    attribute(2, "Business Leadership", false),
  ];

  it("matches case-insensitively and ignores surrounding spaces", () => {
    expect(
      isDuplicateLeadershipAttributeName("  leadership group ", attributes),
    ).toBe(true);
  });

  it("counts retired attributes, matching the unique index", () => {
    expect(
      isDuplicateLeadershipAttributeName("Business Leadership", attributes),
    ).toBe(true);
  });

  it("lets an attribute keep its own name while being edited", () => {
    expect(
      isDuplicateLeadershipAttributeName("Leadership Group", attributes, 1),
    ).toBe(false);
  });

  it("does not flag a new name or a blank one", () => {
    expect(
      isDuplicateLeadershipAttributeName("Senior Leadership", attributes),
    ).toBe(false);
    expect(isDuplicateLeadershipAttributeName("   ", attributes)).toBe(false);
  });
});

describe("isRetireBlocked", () => {
  it("blocks retiring an attribute current employees hold", () => {
    expect(isRetireBlocked(attribute(1, "Held", true, 3), true)).toBe(true);
  });

  it("allows retiring an attribute nobody current holds", () => {
    expect(isRetireBlocked(attribute(1, "Unused", true, 0), true)).toBe(false);
  });

  it("always allows reactivating a retired attribute", () => {
    expect(isRetireBlocked(attribute(1, "Retired", false, 3), false)).toBe(
      false,
    );
  });

  it("does not block when creating a new attribute", () => {
    expect(isRetireBlocked(null, true)).toBe(false);
  });
});

describe("LEADERSHIP_ATTRIBUTE_NAME_PATTERN", () => {
  it.each([
    "Research & Development",
    "C-Suite",
    "Tier 1",
    "Owner's Circle",
    "Sr. Leadership",
    "Équipe Direction",
  ])("accepts %s", (name) => {
    expect(LEADERSHIP_ATTRIBUTE_NAME_PATTERN.test(name)).toBe(true);
  });

  it.each([
    '=HYPERLINK("x")',
    "+Leadership",
    "-Leadership",
    "@Leadership",
    "1 Tier",
    "Research, Development",
    "Tier\t1",
  ])("rejects %s", (name) => {
    expect(LEADERSHIP_ATTRIBUTE_NAME_PATTERN.test(name)).toBe(false);
  });
});

