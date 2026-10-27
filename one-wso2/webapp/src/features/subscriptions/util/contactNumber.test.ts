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
  formatContactNumberForDisplay,
  isValidContactNumber,
  normalizeContactNumber,
} from "@features/subscriptions/util/contactNumber";

describe("isValidContactNumber", () => {
  it("accepts the backend's exact shape", () => {
    expect(isValidContactNumber("+94713456789")).toBe(true);
  });

  it("tolerates surrounding whitespace, matching normalizeContactNumber", () => {
    expect(isValidContactNumber("  +94713456789  ")).toBe(true);
  });

  it("rejects anything the backend's constraint would reject", () => {
    expect(isValidContactNumber("+94813456789")).toBe(false); // wrong prefix digit
    expect(isValidContactNumber("94713456789")).toBe(false); // missing +
    expect(isValidContactNumber("+9471345678")).toBe(false); // one digit short
    expect(isValidContactNumber("")).toBe(false);
  });
});

describe("normalizeContactNumber", () => {
  it("trims for the wire", () => {
    expect(normalizeContactNumber("  +94713456789  ")).toBe("+94713456789");
  });
});

describe("formatContactNumberForDisplay", () => {
  it("groups the nine local digits 2-3-4", () => {
    expect(formatContactNumberForDisplay("+94713456789")).toBe("+94 71 345 6789");
  });

  it("falls back to the raw value when the shape doesn't match", () => {
    // Untrimmed input is the caller's mistake, not something to silently
    // reformat around — normalizeContactNumber is the trim step, not this.
    expect(formatContactNumberForDisplay(" +94713456789 ")).toBe(" +94713456789 ");
    expect(formatContactNumberForDisplay("")).toBe("");
    expect(formatContactNumberForDisplay("not a number")).toBe("not a number");
  });
});
