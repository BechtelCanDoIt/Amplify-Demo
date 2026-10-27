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


/** A product in the formula editor's list. */
export interface FormulaProductOption {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
}

/** A binding as the Admin sends it: products by Id only (names come from Salesforce). */
export interface FormulaBindingInput {
  readonly name: string;
  readonly kind: "VALUE" | "PRODUCTS";
  readonly value: string;
  readonly productIds: readonly string[];
}

/** A formula worked out with sample values; nothing is saved. */
export interface PricingFormulaTryInput {
  readonly expression: string;
  readonly bindings: readonly FormulaBindingInput[];
  /** A sample total for each PRODUCTS placeholder: { "$3": "320000" }. */
  readonly samples: Record<string, string>;
  readonly quantity: number;
  readonly listPrice: string;
}

export interface PricingFormulaTryResult {
  readonly unitPrice: string;
  readonly explanation: string;
}
