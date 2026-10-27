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

import { useQuery } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { dueDiligenceServiceUrls, isDueDiligenceBackendConfigured } from "@config/apiConfig";

export interface AppConfigResponse {
  // Empty when the backend's own `clientBaseUrl` configurable isn't set —
  // callers should treat that as "can't build a client link" rather than
  // constructing one from an empty string.
  clientBaseUrl: string;
}

// GET /app-config — non-identity, app-wide config the backend owns (right
// now, just the client-facing webapp's base URL for "Copy Link"). Separate
// from useDueDiligenceMe: this isn't a role decision, and mixing the two
// would make an unrelated config fetch fail the whole gate whenever it 404s
// on an older backend.
export function useDueDiligenceAppConfig(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<AppConfigResponse>({
    queryKey: ["due-diligence-app-config"],
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<AppConfigResponse>(dueDiligenceServiceUrls.appConfig, accessToken);
    },
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
}
