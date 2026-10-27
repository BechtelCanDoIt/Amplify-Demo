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
import { isSriLankaWorkLocation } from "@utils/locationGate";

describe("isSriLankaWorkLocation", () => {
  it("matches the expected value", () => {
    expect(isSriLankaWorkLocation("Sri Lanka")).toBe(true);
  });

  it("is tolerant of case and stray whitespace — a free-text HR field, not an enum", () => {
    expect(isSriLankaWorkLocation("sri lanka")).toBe(true);
    expect(isSriLankaWorkLocation("SRI LANKA")).toBe(true);
    expect(isSriLankaWorkLocation("  Sri Lanka  ")).toBe(true);
  });

  it("rejects every other location", () => {
    expect(isSriLankaWorkLocation("India")).toBe(false);
    expect(isSriLankaWorkLocation("France")).toBe(false);
    expect(isSriLankaWorkLocation("Sri Lanka - Colombo")).toBe(false);
  });

  it("fails closed on an unknown location — null, undefined, or empty", () => {
    expect(isSriLankaWorkLocation(null)).toBe(false);
    expect(isSriLankaWorkLocation(undefined)).toBe(false);
    expect(isSriLankaWorkLocation("")).toBe(false);
  });
});
