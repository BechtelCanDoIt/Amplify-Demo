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

// A refresh should land on the start screen, while a link, a pin or the back button still opens the search it names.
// The browser says how the page was loaded; this only applies to the address the page was loaded on, and only once.
let handled = false;

/** True when this page load was a refresh of the address being shown now, and it has not been dealt with yet. */
export function isRefreshOfThisAddress(): boolean {
  if (handled) return false;
  try {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return entry?.type === "reload" && entry.name === window.location.href;
  } catch {
    return false;
  }
}

export function markRefreshHandled(): void {
  handled = true;
}

/** For tests: forget that a refresh was dealt with. */
export function resetRefreshForTests(): void {
  handled = false;
}
