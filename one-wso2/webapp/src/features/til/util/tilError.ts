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

// Shared error helpers for the til feature — same arrangement menu/leave use.
import { describeError, httpRetry } from "@api/errors";
import { HttpError } from "@api/http";

export { describeError };

/** No retries on 4xx — a 403 (not in the submitting... group) is a final answer. */
export const tilRetry = httpRetry;

/** True when a single entry wasn't found (deleted, or a bad/stale link) —
 * same shape as Sales' own isForbidden, one status code read off HttpError. */
export function isNotFound(error: unknown): boolean {
  return error instanceof HttpError && error.status === 404;
}
