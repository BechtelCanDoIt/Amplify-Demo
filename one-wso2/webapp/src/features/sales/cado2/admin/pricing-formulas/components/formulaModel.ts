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

// The editor's model: which placeholders a formula uses, and the bindings it
// sends. Kept apart from the dialog so it can be tested on its own.

import type { FormulaBinding, FormulaProduct, PricingFormula } from "@features/sales/cado2/quotes/api/quoteTypes";
import type { FormulaBindingInput } from "@features/sales/cado2/admin/pricing-formulas/api/pricingFormulaTypes";

/** One placeholder's value as the editor holds it, whichever kind is showing. */
export interface BindingDraft {
  readonly kind: "VALUE" | "PRODUCTS";
  readonly value: string;
  readonly products: readonly FormulaProduct[];
}

export const EMPTY_BINDING: BindingDraft = { kind: "VALUE", value: "", products: [] };

/** The placeholders a formula uses, once each, in number order: "max($2, $1 * $2)" → ["$1", "$2"]. */
export function placeholdersOf(expression: string): string[] {
  const names = new Set(expression.match(/\$[1-9]\d?/g) ?? []);
  return [...names].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

export const usesQty = (expression: string): boolean => /\bQTY\b/.test(expression);
export const usesListPrice = (expression: string): boolean => /\bLIST_PRICE\b/.test(expression);

/** A saved formula's bindings, by placeholder. */
export function draftsOf(f: PricingFormula | null): Record<string, BindingDraft> {
  const out: Record<string, BindingDraft> = {};
  for (const b of f?.bindings ?? []) out[b.name] = draftOf(b);
  return out;
}

function draftOf(b: FormulaBinding): BindingDraft {
  return { kind: b.kind, value: b.value ?? "", products: b.products ?? [] };
}

/**
 * The bindings to send: one per placeholder in the formula (a binding left
 * from an earlier version of the formula is dropped), sorted by name as the
 * backend sorts them, so its "bindings[i]" refusals point at the same row.
 */
export function bindingInputs(expression: string, drafts: Record<string, BindingDraft>): FormulaBindingInput[] {
  return placeholdersOf(expression)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((name) => {
      const d = drafts[name] ?? EMPTY_BINDING;
      return d.kind === "VALUE"
        ? { name, kind: "VALUE", value: d.value.trim(), productIds: [] }
        : { name, kind: "PRODUCTS", value: "", productIds: d.products.map((p) => p.id) };
    });
}
