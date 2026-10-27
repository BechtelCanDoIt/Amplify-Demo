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
import type { PromotionAppConfigResponse, PromotionSyncState } from "./types";

// GET /app-configs?key=<key>. Two independent Admin Portal flows share this
// shape (source's own two thunks, checkSyncState for users and
// checkSyncStatus for time-based promotions, are near-identical bodies
// against different keys) — collapsed into one generic hook, parameterized
// by the key, rather than duplicated per caller.
//
// Polls every 2s while IN_PROGRESS (source's own InProgressLabel interval),
// stops polling once the flag settles — a caller that sees SUCCESS/ERROR is
// expected to reset it server-side (or just re-enable this hook) before the
// next sync attempt, matching source's own one-shot "consume and reset to
// IDLE" handling in each panel's own effect.
export function usePromotionSyncState(key: "SYNC_STATE" | "TIME_BASED_PROMOTION_STATE", enabled: boolean) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  const query = useQuery<PromotionAppConfigResponse>({
    queryKey: ["promotion-sync-state", key],
    enabled: enabled && isSignedIn && backendConfigured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PromotionAppConfigResponse>(promotionServiceUrls.appConfig(key), accessToken, digiopsHeaders());
    },
    refetchInterval: (query) => {
      const state = query.state.data?.appConfigs[0]?.value as PromotionSyncState | undefined;
      return state === "IN_PROGRESS" ? 2000 : false;
    },
    retry: defaultQueryRetry,
  });

  const state = (query.data?.appConfigs[0]?.value as PromotionSyncState | undefined) ?? "IDLE";
  return { ...query, state };
}
