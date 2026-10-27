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
import { securityBackendUrl } from "@config/apiConfig";
import { useAuthApiClient } from "@features/security/grc/shim/useAuthApiClient";

interface UserGuideUrlResponse {
  url: string;
}

// The GRC Platform user guide link, served by GRC_USER_GUIDE_URL on the GRC
// backend (GET /api/v1/meta/user-guide-url) rather than frontend config —
// changing or unsetting it is then an env var edit on that backend, not a
// webapp redeploy. `url` is "" when unset; SideRail hides the row then.
//
// `enabled` should be `active.key === "security"`, same as every other
// perspective-scoped gate in usePerspectiveVisibility — fetched once the
// Security and Compliance perspective opens, not on click, so the "User
// Guide" row can open its tab synchronously within the click handler rather
// than after an await (which browsers treat as an unsolicited popup and block).
export function useUserGuideUrl(enabled: boolean) {
  const authFetch = useAuthApiClient();

  return useQuery({
    queryKey: ["security", "user-guide-url"],
    queryFn: async (): Promise<UserGuideUrlResponse> => {
      const res = await authFetch(`${securityBackendUrl}/api/v1/meta/user-guide-url`);
      if (!res.ok) throw new Error(`Failed to load the user guide URL (${res.status})`);
      return res.json() as Promise<UserGuideUrlResponse>;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
