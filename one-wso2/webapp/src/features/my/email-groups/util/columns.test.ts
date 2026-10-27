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
import { splitIntoColumns } from "./columns";

describe("splitIntoColumns", () => {
  it("splits evenly when the count divides cleanly", () => {
    expect(splitIntoColumns([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it("front-loads earlier columns when it doesn't divide evenly", () => {
    // 10 items / 3 columns -> ceil(10/3) = 4 per column: 4, 4, 2.
    expect(splitIntoColumns([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10],
    ]);
  });

  it("fewer items than columns leaves later columns empty", () => {
    expect(splitIntoColumns(["a", "b"], 3)).toEqual([["a"], ["b"], []]);
  });

  it("empty input yields all-empty columns", () => {
    expect(splitIntoColumns([], 3)).toEqual([[], [], []]);
  });

  it("every item appears exactly once, in order", () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    const columns = splitIntoColumns(items, 3);
    expect(columns.flat()).toEqual(items);
  });
});
