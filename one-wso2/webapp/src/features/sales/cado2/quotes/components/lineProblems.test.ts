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
import { lineProblems } from "./lineProblems";

const ok = {
  pricebookEntryId: "01u000000000001",
  quantity: "3",
  discount: "10",
};

describe("lineProblems", () => {
  it("accepts a complete line", () => {
    expect(lineProblems(ok)).toEqual({});
  });

  it("needs a price book entry", () => {
    expect(lineProblems({ ...ok, pricebookEntryId: "" })).toHaveProperty("product");
  });

  it.each(["0", "1.5", "-2", "abc", ""])("rejects quantity %j", (quantity) => {
    expect(lineProblems({ ...ok, quantity })).toHaveProperty("quantity");
  });

  it.each(["100.001", "101", "-1", "5%"])("rejects discount %j", (discount) => {
    expect(lineProblems({ ...ok, discount })).toHaveProperty("discount");
  });

  it("treats a blank discount as 0", () => {
    expect(lineProblems({ ...ok, discount: " " })).toEqual({});
  });

});
