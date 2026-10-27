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
  buildGroupCatalog,
  filterMyGroupRows,
  filterPublicGroupsBySearch,
  joinablePublicGroups,
  myGroupRows,
} from "./groupCatalog";
import type { GroupCatalog } from "../api/emailGroupTypes";

describe("buildGroupCatalog", () => {
  it("splits into default / public / private", () => {
    const catalog = buildGroupCatalog(
      ["info@wso2.com"],
      ["info@wso2.com", "news@wso2.com", "team-x@wso2.com"],
      ["info@wso2.com", "news@wso2.com", "legacy-list@wso2.com"],
    );

    expect(catalog.defaultGroups).toEqual(["info@wso2.com"]);
    expect(catalog.publicGroups).toEqual([
      { name: "news@wso2.com", isSubscribed: true },
      { name: "team-x@wso2.com", isSubscribed: false },
    ]);
    expect(catalog.privateGroups).toEqual(["legacy-list@wso2.com"]);
  });

  it("a default group is never also a public entry, even if the backend lists it in both", () => {
    const catalog = buildGroupCatalog(
      ["info@wso2.com"],
      ["info@wso2.com", "news@wso2.com"],
      ["info@wso2.com"],
    );
    expect(catalog.publicGroups.map((g) => g.name)).toEqual(["news@wso2.com"]);
  });

  it("a subscribed group that is neither default nor public is a private group", () => {
    const catalog = buildGroupCatalog([], [], ["only-mine@wso2.com"]);
    expect(catalog.privateGroups).toEqual(["only-mine@wso2.com"]);
    expect(catalog.publicGroups).toEqual([]);
  });

  it("handles all-empty input", () => {
    expect(buildGroupCatalog([], [], [])).toEqual({
      defaultGroups: [],
      publicGroups: [],
      privateGroups: [],
    });
  });
});

describe("joinablePublicGroups / filterPublicGroupsBySearch", () => {
  const groups = [
    { name: "team-x@wso2.com", isSubscribed: true },
    { name: "team-y@wso2.com", isSubscribed: false },
    { name: "news@wso2.com", isSubscribed: false },
  ];

  it("keeps only groups the caller hasn't joined", () => {
    expect(joinablePublicGroups(groups).map((g) => g.name)).toEqual([
      "team-y@wso2.com",
      "news@wso2.com",
    ]);
  });

  it("search is case-insensitive", () => {
    expect(filterPublicGroupsBySearch(groups, "TEAM").map((g) => g.name)).toEqual([
      "team-x@wso2.com",
      "team-y@wso2.com",
    ]);
  });

  it("blank search matches everything", () => {
    expect(filterPublicGroupsBySearch(groups, "  ")).toHaveLength(3);
  });
});

describe("myGroupRows", () => {
  const catalog: GroupCatalog = {
    defaultGroups: ["announce@wso2.com"],
    publicGroups: [
      { name: "team-x@wso2.com", isSubscribed: true },
      { name: "team-y@wso2.com", isSubscribed: false },
    ],
    privateGroups: ["legacy-list@wso2.com"],
  };

  it("all: every origin the caller is subscribed to, unsubscribed public groups excluded", () => {
    expect(myGroupRows(catalog, "all")).toEqual([
      { name: "announce@wso2.com", category: "default" },
      { name: "legacy-list@wso2.com", category: "private" },
      { name: "team-x@wso2.com", category: "public" },
    ]);
  });

  it("default: only default groups", () => {
    expect(myGroupRows(catalog, "default")).toEqual([
      { name: "announce@wso2.com", category: "default" },
    ]);
  });

  it("private: only private groups", () => {
    expect(myGroupRows(catalog, "private")).toEqual([
      { name: "legacy-list@wso2.com", category: "private" },
    ]);
  });

  it("public: only SUBSCRIBED public groups — a joinable one is never a My Groups row", () => {
    expect(myGroupRows(catalog, "public")).toEqual([
      { name: "team-x@wso2.com", category: "public" },
    ]);
  });

  it("empty catalog yields no rows for any filter", () => {
    const empty: GroupCatalog = { defaultGroups: [], publicGroups: [], privateGroups: [] };
    expect(myGroupRows(empty, "all")).toEqual([]);
  });
});

describe("filterMyGroupRows", () => {
  const rows = [
    { name: "announce@wso2.com", category: "default" as const },
    { name: "team-x@wso2.com", category: "public" as const },
  ];

  it("filters case-insensitively by name", () => {
    expect(filterMyGroupRows(rows, "team")).toEqual([
      { name: "team-x@wso2.com", category: "public" },
    ]);
  });

  it("blank search matches everything", () => {
    expect(filterMyGroupRows(rows, "")).toHaveLength(2);
  });
});
