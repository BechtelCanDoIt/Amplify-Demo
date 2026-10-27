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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedGet, authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { dueDiligenceServiceUrls, isDueDiligenceBackendConfigured } from "@config/apiConfig";
import type { CreditScoreData, CreditScoreItem } from "./creditScoreTypes";

const creditScoreKey = (companyId: string | number) => ["due-diligence", "credit-score", companyId];

/** GET /credit-score-items/{companyId} — the 3 years' worth of raw financials, the ratio scales, and the reported currency. */
export function useCreditScoreItems(companyId: string | number, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<CreditScoreData>({
    queryKey: creditScoreKey(companyId),
    enabled: enabled && configured && Boolean(companyId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<CreditScoreData>(dueDiligenceServiceUrls.creditScoreItemsForPartner(companyId), accessToken);
    },
    retry: httpRetry,
  });
}

/** POST /credit-score-items — bulk-insert the 3 years' financials (superuser-only, per the backend's "All Credit Score Requests" privilege). */
export function useSaveCreditScoreItems(companyId: string | number) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: CreditScoreItem[]) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.creditScoreItemsInsert, accessToken, items);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creditScoreKey(companyId) });
    },
  });
}
