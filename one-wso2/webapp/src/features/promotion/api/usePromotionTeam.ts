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
import { useAsgardeo } from "@asgardeo/react";
import { authedGet, defaultQueryRetry } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { promotionServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";
import { isPromotionBackendConfigured } from "./usePromotionEmployeeInfo";
import type { PromotionEmployeesResponse } from "./types";

// GET /employees, scoped to one relationship — ports source's own
// getLeadEmployees (managerEmail) and getAdditionalLeadEmployees
// (additionalManagerEmail), which are otherwise identical fetches against
// the same resource. Used by the Lead Portal's Team Promotion History tabs.
export function usePromotionTeam(kind: "direct" | "indirect", email: string | undefined) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  return useQuery<PromotionEmployeesResponse>({
    queryKey: ["promotion-team", kind, email],
    enabled: isSignedIn && backendConfigured && Boolean(email),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const params = kind === "direct" ? { managerEmail: email } : { additionalManagerEmail: email };
      return authedGet<PromotionEmployeesResponse>(
        promotionServiceUrls.promotionEmployees(params),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}
