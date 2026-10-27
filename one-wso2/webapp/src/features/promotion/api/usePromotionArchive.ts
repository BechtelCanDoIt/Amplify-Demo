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
import type { ArchivedPromotionsResponse } from "./types";

export interface PromotionArchiveParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  employeeEmail?: string;
}

// GET /promotion/history — the People HR Archive tab's own grid (filtered
// by name/date-range) and its person drill-down (filtered by
// employeeEmail alone, ignoring the grid's own filters — source's own
// "the full history, not what the filter matched").
export function usePromotionArchive(params: PromotionArchiveParams, enabled = true) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  return useQuery<ArchivedPromotionsResponse>({
    queryKey: ["promotion-archive", params],
    enabled: enabled && isSignedIn && backendConfigured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<ArchivedPromotionsResponse>(
        promotionServiceUrls.promotionArchive(params),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}
