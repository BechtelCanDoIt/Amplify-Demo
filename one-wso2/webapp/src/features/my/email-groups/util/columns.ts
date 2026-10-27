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

/**
 * Splits a list into N contiguous, roughly-equal chunks — column 1 gets the
 * first chunk, column 2 the next, and so on. This is the layout the source
 * app used for its group lists (three side-by-side columns, the whole list
 * shown at once rather than paged) — kept here as a plain, testable function
 * rather than the size-dependent branching the source app's own version had.
 */
export function splitIntoColumns<T>(items: readonly T[], columns: number): T[][] {
  const perColumn = Math.ceil(items.length / columns);
  const result: T[][] = [];
  for (let i = 0; i < columns; i++) {
    result.push(items.slice(i * perColumn, (i + 1) * perColumn));
  }
  return result;
}
