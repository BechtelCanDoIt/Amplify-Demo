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
import { formatShortDate } from "./parDate";

describe("formatShortDate", () => {
  it("formats a bare date as D MMM 'YY", () => {
    expect(formatShortDate("2026-09-17")).toBe("17 Sep '26");
  });

  it("formats a single-digit day without a leading zero", () => {
    expect(formatShortDate("2026-09-05")).toBe("5 Sep '26");
  });

  it("formats a date carrying a time component the same way", () => {
    expect(formatShortDate("2026-09-17T00:00:00Z")).toBe("17 Sep '26");
  });

  it("returns an em dash for an absent date", () => {
    expect(formatShortDate(undefined)).toBe("—");
  });

  it("returns the raw value for something that isn't a date at all", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
  });
});
