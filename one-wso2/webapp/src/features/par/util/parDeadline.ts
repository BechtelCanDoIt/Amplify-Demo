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

/** Matches `YYYY-MM-DD` — the only shape the backend's own
 * @constraint:String pattern allows for a par-cycle deadline field. */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Interpreted end-of-day in the browser's own timezone, matching par-app's
 * own deadline checks (dayjs(deadline).endOf("day")) across ParStatusView.tsx,
 * RequestFeedbackTab.tsx and ReviewProvideModal.tsx — one function so every
 * PAR screen's deadline math agrees.
 *
 * Fails CLOSED: a value that isn't a bare `YYYY-MM-DD` (or that produces an
 * invalid Date) is treated as already passed, not as never-passed. The
 * naive `new Date(non-date-only-string)` comparison used to return `false`
 * (Invalid Date compares false either way) for anything malformed — silently
 * leaving every deadline-gated control enabled. */
export function isDeadlinePassed(deadline: string): boolean {
  if (!DATE_ONLY_RE.test(deadline)) return true;
  const parsed = new Date(`${deadline}T23:59:59.999`);
  if (Number.isNaN(parsed.getTime())) return true;
  return new Date() > parsed;
}
