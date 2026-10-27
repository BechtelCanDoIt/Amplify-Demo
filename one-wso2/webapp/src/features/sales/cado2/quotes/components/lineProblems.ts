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

/** Checks the dialog's values the way the backend will. */
export function lineProblems(v: {
  pricebookEntryId: string;
  /** Empty only when the product isn't mapped and the rep hasn't chosen. */
  category?: string;
  quantity: string;
  discount: string;
}): Record<string, string> {
  const p: Record<string, string> = {};
  if (!v.pricebookEntryId) p.product = "Choose a product and a price book";
  if (v.category === "") p.category = "Choose the category";
  if (!/^\d+$/.test(v.quantity.trim()) || Number(v.quantity) < 1) p.quantity = "Use a whole number of at least 1";
  const d = v.discount.trim() || "0";
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(d) || Number(d) > 100) p.discount = "Use 0 to 100, with at most 2 decimals";
  return p;
}
