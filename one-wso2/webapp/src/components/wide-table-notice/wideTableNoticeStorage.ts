/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Split from WideTableNotice so that file exports only the component.
// Exporting this helper beside it trips react-refresh/only-export-components,
// the same split `tourContext.ts` records.

/** Namespaced like the app's other browser-stored keys — `one-wso2.*`. */
const STORAGE_KEY = "one-wso2.wide-table-notice.dismissed";

/**
 * Whether this reader has dismissed it before.
 *
 * Guarded, because `localStorage` THROWS rather than returning null under
 * private browsing and blocked site data — the case `ScalePreferenceContext`
 * guards for the same reason. A notice is the last thing that should take a
 * screen down, so an unreadable store means "not dismissed": the notice shows,
 * which is the harmless direction to fail in.
 */
export function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Remember the dismissal, and say whether it stuck.
 *
 * The boolean is what lets a test assert the write guard rather than infer it:
 * a `try/catch` that swallows silently is indistinguishable from no `try/catch`
 * at all unless something observes the difference. Deleting this guard used to
 * leave every assertion in the suite passing.
 */
export function writeDismissed(): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
    return true;
  } catch {
    // Dismissed for this visit and not remembered, which is the same failure
    // the Scale preference accepts for the same reason.
    return false;
  }
}
