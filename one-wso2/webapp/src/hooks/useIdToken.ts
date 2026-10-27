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

import { useCallback } from "react";
import { useAsgardeo } from "@asgardeo/react";

/**
 * The ID token, for the one backend that authorizes with it.
 *
 * EVERY OTHER BACKEND IN THIS APP USES THE ACCESS TOKEN — see useAccessToken,
 * which is what `@api/http`'s helpers take. This exists solely for the GRC
 * platform (the Security perspective), whose Go backend verifies the ID token
 * and reads `email` off it in two load-bearing places:
 *
 *   - `internal/user/handler/me.go` 401s when `email` is empty. That endpoint
 *     supplies the numeric user_id every risk owner/assigner check compares
 *     against.
 *   - `internal/middleware/caller.go` (`isInternal`) classifies a caller with
 *     no email domain as EXTERNAL, and the route guard then 403s every Risk
 *     and Admin route before any handler runs.
 *
 * `email`, `groups` and `sub` are id_token-only claims in this app (see the
 * note in @api/authBridge), so sending the access token to that backend would
 * fail on identity, not merely on audience — and it would fail as a 403 that
 * looks exactly like a missing permission.
 *
 * Sourced from the Asgardeo hook rather than @api/authBridge's registered
 * accessor, for the same reason useAccessToken is: the bridge accessor is only
 * safe on the 401-retry path, which by definition runs after a first request
 * already succeeded.
 */
export function useIdToken(): () => Promise<string> {
  const { getIdToken } = useAsgardeo();
  return useCallback(async () => {
    const token = await getIdToken();
    if (!token) throw new Error("No id_token available from Asgardeo");
    return token;
  }, [getIdToken]);
}
