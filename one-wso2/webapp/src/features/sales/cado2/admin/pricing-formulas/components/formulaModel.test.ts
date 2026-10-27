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
import { bindingInputs, draftsOf, placeholdersOf, usesListPrice, usesQty } from "./formulaModel";

describe("formulaModel", () => {
  it("finds each placeholder once, in number order", () => {
    expect(placeholdersOf("max($10, $2 * $1) + $2")).toEqual(["$1", "$2", "$10"]);
    expect(placeholdersOf("QTY * 5")).toEqual([]);
    expect(usesQty("QTY * 5")).toBe(true);
    expect(usesQty("QTYX")).toBe(false);
    expect(usesListPrice("LIST_PRICE * 0.9")).toBe(true);
  });

  it("sends one binding per placeholder, sorted as the backend sorts them, without leftovers", () => {
    const drafts = {
      $1: { kind: "VALUE" as const, value: " 25000 ", products: [] },
      $2: { kind: "PRODUCTS" as const, value: "9", products: [{ id: "01tA", name: "A", code: null }] },
      $9: { kind: "VALUE" as const, value: "1", products: [] },
    };
    // "$10" sorts before "$2" as text: the backend's "bindings[1]" is $10.
    expect(bindingInputs("max($1, $10) + $2", drafts)).toEqual([
      { name: "$1", kind: "VALUE", value: "25000", productIds: [] },
      { name: "$10", kind: "VALUE", value: "", productIds: [] },
      { name: "$2", kind: "PRODUCTS", value: "", productIds: ["01tA"] },
    ]);
  });

  it("starts from a saved formula's bindings", () => {
    const drafts = draftsOf({
      versionId: 3,
      version: 2,
      status: "ACTIVE",
      productId: "01tS",
      productName: "Support",
      productCode: null,
      expression: "max($1, $2)",
      bindings: [
        { name: "$1", kind: "VALUE", value: "25000" },
        { name: "$2", kind: "PRODUCTS", products: [{ id: "01tA", name: "A", code: null }] },
      ],
      unitOfMeasure: "Annual",
      updatedByEmail: "admin@wso2.com",
      updatedAt: "2026-10-15T10:00:00Z",
    });
    expect(drafts.$1).toEqual({ kind: "VALUE", value: "25000", products: [] });
    expect(drafts.$2.products).toHaveLength(1);
    expect(draftsOf(null)).toEqual({});
  });
});
