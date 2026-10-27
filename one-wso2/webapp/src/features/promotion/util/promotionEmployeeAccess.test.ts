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
import { promotionEmployeeAccess } from "./promotionEmployeeAccess";

describe("promotionEmployeeAccess", () => {
  it("hides the item for an employment type it is not for, whatever the casing", () => {
    expect(promotionEmployeeAccess("INTERNSHIP", false).canSee).toBe(false);
    expect(promotionEmployeeAccess("Internship", false).canSee).toBe(false);
  });

  it("shows it for other employment types", () => {
    expect(promotionEmployeeAccess("PERMANENT", false).canSee).toBe(true);
    expect(promotionEmployeeAccess("CONSULTANCY", false).canSee).toBe(true);
  });

  it("does not hide it just because the employment type is unknown", () => {
    expect(promotionEmployeeAccess(undefined, false).canSee).toBe(true);
  });

  it("reports loading while the profile is pending", () => {
    expect(promotionEmployeeAccess(undefined, true).isLoading).toBe(true);
    expect(promotionEmployeeAccess("PERMANENT", false).isLoading).toBe(false);
  });
});
