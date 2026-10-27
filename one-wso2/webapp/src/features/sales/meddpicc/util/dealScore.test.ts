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
import { bandColor, formatScore, scoreBand } from "./dealScore";

describe("deal score", () => {
  it("names the band as Salesforce's meter does", () => {
    expect([0, 28.3, 49.9, 50, 69.9, 70, 100].map(scoreBand)).toEqual([
      "Weak", "Weak", "Weak", "Moderate", "Moderate", "Strong", "Strong",
    ]);
    expect(bandColor("Weak")).toBe("error");
    expect(bandColor("Moderate")).toBe("warning");
    expect(bandColor("Strong")).toBe("success");
  });

  it("shows one decimal, and whole numbers as they are", () => {
    expect(formatScore(28.3)).toBe("28.3");
    expect(formatScore(17.06)).toBe("17.1");
    expect(formatScore(70)).toBe("70");
  });

  it("reads the band from the score as shown, so the two never disagree", () => {
    expect(formatScore(49.96)).toBe("50");
    expect(scoreBand(49.96)).toBe("Moderate");
    expect(formatScore(69.95)).toBe("70");
    expect(scoreBand(69.95)).toBe("Strong");
    expect(scoreBand(49.94)).toBe("Weak");
  });
});
