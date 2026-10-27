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

import type { DataGrid } from "@wso2/oxygen-ui";

/**
 * The ids a DataGrid selection model actually selects.
 *
 * The grid reports selection two ways (GridRowSelectionModel): `include` with
 * the chosen ids, or `exclude` with the ids left out — which is what the
 * header select-all emits when every row is selectable. Reading `.ids`
 * without looking at `.type` inverts that case: select-all arrives as an
 * empty exclude-set and would clear the selection instead of making it.
 *
 * `rows` is what the grid currently holds, so an exclude-set is resolved
 * against the rows on screen rather than the whole dataset.
 */
export function resolveGridSelectedIds(
  model: { type: "include" | "exclude"; ids: Set<DataGrid.GridRowId> },
  rows: { id: number }[],
): number[] {
  if (model.type === "include") {
    return [...model.ids].map(Number);
  }
  return rows.map((r) => r.id).filter((id) => !model.ids.has(id));
}
