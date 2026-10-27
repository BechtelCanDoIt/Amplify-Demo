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
import { useAsgardeo } from "@asgardeo/react";
import { authedGet, defaultQueryRetry } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { promotionServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";
import { isPromotionBackendConfigured } from "./usePromotionEmployeeInfo";
import type { PromotionRequestsResponse } from "./types";

const WITHDRAWAL_KEY = "promotion-withdrawal-requests";

// GET /promotion/requests?statusArray=WITHDRAW,REMOVED — every request an
// employee has asked to withdraw (pending decision) plus every one already
// decided (REMOVED = withdrawal approved, terminal). Both statuses share
// one list, same as source's own getAllWithdrawalRequest.
export function useWithdrawalRequests() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  return useQuery<PromotionRequestsResponse>({
    queryKey: [WITHDRAWAL_KEY],
    enabled: isSignedIn && backendConfigured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PromotionRequestsResponse>(
        promotionServiceUrls.promotionRequests({ statusArray: ["WITHDRAW", "REMOVED"] }),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 30 * 1000,
    retry: defaultQueryRetry,
  });
}

function useInvalidateWithdrawalRequests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [WITHDRAWAL_KEY] });
}

// GET .../requests/{id}/remove — approves the withdrawal (request becomes
// REMOVED, terminal). Named for the backend's own side effect, not the UI
// verb — see promotionServiceUrls.promotionRequestWithdrawApprove's comment.
export function useApproveWithdrawal() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidateWithdrawalRequests();
  return useMutation({
    mutationFn: async (id: number) => {
      const accessToken = await getAccessToken();
      return authedGet(promotionServiceUrls.promotionRequestWithdrawApprove(id), accessToken, digiopsHeaders());
    },
    onSuccess: () => invalidate(),
  });
}

// GET .../requests/{id}/submit — rejects the withdrawal (request reverts to
// its prior submitted/active state).
export function useRejectWithdrawal() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidateWithdrawalRequests();
  return useMutation({
    mutationFn: async (id: number) => {
      const accessToken = await getAccessToken();
      return authedGet(promotionServiceUrls.promotionRequestWithdrawReject(id), accessToken, digiopsHeaders());
    },
    onSuccess: () => invalidate(),
  });
}
