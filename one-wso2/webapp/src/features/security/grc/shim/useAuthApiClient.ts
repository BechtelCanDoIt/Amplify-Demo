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
import { fetchWithReauth } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";

// The seam between the lifted GRC source and this app.
//
// Every lifted file calls `useAuthApiClient()` and gets back a fetch it passes
// into the api layer. Reproducing that signature is what lets ~16,000 lines
// come across unedited, so this file is the ONE place the two apps' auth
// differ — and the first thing to read when a Security screen misbehaves in a
// way no other perspective does.
//
// ── WHICH TOKEN ────────────────────────────────────────────────────────────
//
// This app's access token, via `fetchWithReauth` — the same path every other
// backend here uses.
//
// The source sends the ID token instead (`hooks/useAuthApiClient.ts:84`,
// `getIdToken()`), and the GRC backend reads `email` off the verified token in
// two load-bearing places: `internal/user/handler/me.go` 401s on an empty
// email, and `internal/middleware/caller.go` (`isInternal`) classifies a caller
// with no email domain as EXTERNAL, which makes the route guard 403 every Risk
// and Admin route before any handler runs.
//
// So the question is only whether THIS app's access token carries `email`.
// Both tokens come from the same Asgardeo application, requested with the same
// scopes (`openid email groups profile` — config/authConfig.ts), and in this
// tenant their claim sets are close enough that the access token carries what
// the backend needs. Using it keeps Security on one token path with the rest of
// the app rather than introducing a second.
//
// IF THAT TURNS OUT TO BE WRONG, the symptom is specific and misleading: every
// Risk and Admin route 403s in a way that looks exactly like a missing
// permission, while `/me/privileges` itself succeeds. Confirm by decoding both
// tokens side by side — the dev debug panel does this
// (features/debug/AuthDebugPanel.tsx) — and check whether `email` is present.
// The fix is then one line: swap `useAccessToken` for `useIdToken`
// (@hooks/useIdToken, kept for exactly this) and `fetchWithReauth` for an
// id_token refresh. Nothing else in the lifted tree changes.
// ───────────────────────────────────────────────────────────────────────────
export function useAuthApiClient() {
  const getAccessToken = useAccessToken();

  return useCallback(
    async (input: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
      const headers = new Headers(options?.headers);
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      const method = options?.method?.toUpperCase() ?? "GET";
      // FormData must set its own multipart boundary — forcing JSON here would
      // corrupt every evidence upload.
      const isFormData = options?.body instanceof FormData;
      if (options?.body && method !== "GET" && !isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      // fetchWithReauth carries this app's 401-refresh-and-retry, including its
      // rule that only a GET is safe to replay blind.
      return fetchWithReauth(String(input), { ...options, headers }, await getAccessToken());
    },
    [getAccessToken],
  );
}
