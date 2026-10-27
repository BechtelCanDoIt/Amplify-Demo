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

import type { FormulaBinding } from "@features/sales/cado2/quotes/api/quoteTypes";
import { formatDate } from "@features/sales/cado2/quotes/form/draftForm";

/** "$1 = 25000 · $3 = total of Gateway + Integrator": a formula's bindings on one line (D81). */
export function bindingsSummary(bindings: readonly FormulaBinding[]): string {
  return bindings
    .map((b) => `${b.name} = ${b.kind === "VALUE" ? b.value : `total of ${(b.products ?? []).map((p) => p.name).join(" + ")}`}`)
    .join(" · ");
}

/** "v3 · 15 Oct 2026": a formula version and the day it was made (D82). */
export function versionLabel(version: number, day: string): string {
  return `v${version} · ${formatDate(day.slice(0, 10))}`;
}
