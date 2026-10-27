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
import { isFullPageLocation } from "./fullPageRoutes";

describe("isFullPageLocation", () => {
  it("drops the shell for an entry read as an article", () => {
    expect(isFullPageLocation({ pathname: "/knowledge/today-i-learned/abc", search: "?view=article" })).toBe(true);
  });

  it("keeps it for the same entry read inside One WSO2", () => {
    expect(isFullPageLocation({ pathname: "/knowledge/today-i-learned/abc", search: "" })).toBe(false);
    expect(isFullPageLocation({ pathname: "/knowledge/today-i-learned/abc", search: "?view=other" })).toBe(false);
  });

  it("keeps it everywhere else, even with the same parameter", () => {
    expect(isFullPageLocation({ pathname: "/knowledge/today-i-learned", search: "?view=article" })).toBe(false);
    expect(isFullPageLocation({ pathname: "/me", search: "?view=article" })).toBe(false);
  });
});
