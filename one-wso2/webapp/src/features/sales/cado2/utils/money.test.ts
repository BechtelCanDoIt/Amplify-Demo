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
import { formatMoney, sumMoney } from "./money";

describe("money", () => {
  it("adds decimal strings exactly", () => {
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
    expect(sumMoney(["41000.00", "360", "0.5"])).toBe("41360.50");
    expect(sumMoney([])).toBe("0.00");
    expect(sumMoney(["-1.25", "1.00"])).toBe("-0.25");
  });

  it("refuses anything that isn't an amount", () => {
    expect(() => sumMoney(["1.234"])).toThrow();
    expect(() => sumMoney(["abc"])).toThrow();
  });

  it("formats with thousands separators, keeping the decimals", () => {
    expect(formatMoney("1234567.80")).toBe("1,234,567.80");
    expect(formatMoney(null)).toBe("—");
  });
});
