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
import { resolveGridSelectedIds } from "./parGridSelection";

const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

describe("resolveGridSelectedIds", () => {
  it("returns the chosen ids for an include model", () => {
    expect(resolveGridSelectedIds({ type: "include", ids: new Set([1, 3]) }, rows)).toEqual([1, 3]);
  });

  it("returns an empty array for an empty include model", () => {
    expect(resolveGridSelectedIds({ type: "include", ids: new Set() }, rows)).toEqual([]);
  });

  it("resolves an empty exclude model (select-all) to every visible row", () => {
    expect(resolveGridSelectedIds({ type: "exclude", ids: new Set() }, rows)).toEqual([1, 2, 3]);
  });

  it("resolves a non-empty exclude model to every row except the excluded ones", () => {
    expect(resolveGridSelectedIds({ type: "exclude", ids: new Set([2]) }, rows)).toEqual([1, 3]);
  });
});
