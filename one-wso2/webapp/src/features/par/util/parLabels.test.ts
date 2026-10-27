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
import { employeeChipLabel } from "./parLabels";

describe("employeeChipLabel", () => {
  it.each([
    ["TOP5P", "Top 5%", "warning"],
    ["TOP20P", "Top 20%", "warning"],
    ["Successful", "Successful", "success"],
    ["Needs Improvements", "Need Improvements", "error"],
    ["Below Expectations", "Below Expectations", "error"],
    ["NOT_ASSIGNED", "Not Assigned", "default"],
    ["Exceptional", "Exceptional", "primary"],
  ])("maps %s to { label: %s, color: %s }", (raw, label, color) => {
    expect(employeeChipLabel(raw)).toEqual({ label, color });
  });

  it("is case-insensitive, admin-entered ratings included", () => {
    expect(employeeChipLabel("below expectations").color).toBe("error");
    expect(employeeChipLabel("SUCCESSFUL").color).toBe("success");
  });

  it("trims stray whitespace from an admin-entered rating's own label", () => {
    expect(employeeChipLabel(" Successful ")).toEqual({ label: "Successful", color: "success" });
    expect(employeeChipLabel(" Below Expectations ")).toEqual({ label: "Below Expectations", color: "error" });
  });

  it("falls back to the trimmed raw text for an unrecognized rating", () => {
    expect(employeeChipLabel(" Outstanding ")).toEqual({ label: "Outstanding", color: "default" });
  });

  it("falls back for an empty string", () => {
    expect(employeeChipLabel("")).toEqual({ label: "", color: "default" });
  });
});
