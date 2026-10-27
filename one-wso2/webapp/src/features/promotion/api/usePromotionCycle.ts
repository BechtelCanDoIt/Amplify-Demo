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

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { authedGet, defaultQueryRetry } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { promotionServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";
import { isPromotionBackendConfigured } from "./usePromotionEmployeeInfo";
import type { PromotionCycle, PromotionCyclesResponse } from "./types";

// GET /promotion/cycles?statusArray=OPEN, narrowed to the one cycle every
// caller actually wants — source's own thunks all read promotionCycles[0]
// and treat an empty array as "no cycle running" (getAllRecommendationsWithActivePromoCycle,
// recommendationHistory's getRecommendationsHistory). The backend doesn't
// document at most one OPEN cycle, but every source call site assumes it.
export function useActivePromotionCycle() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  const query = useQuery<PromotionCyclesResponse>({
    queryKey: ["promotion-cycles", "OPEN"],
    enabled: isSignedIn && backendConfigured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PromotionCyclesResponse>(
        promotionServiceUrls.promotionCycles("OPEN"),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });

  const cycle: PromotionCycle | null = useMemo(
    () => query.data?.promotionCycles[0] ?? null,
    [query.data],
  );

  return { ...query, cycle };
}

// GET /promotion/cycles?statusArray=END — every closed cycle, org-wide.
// Unlike useActivePromotionCycle, Promotion Cycle History genuinely wants
// the whole list (a picker to choose among), not just the first one.
export function useInactivePromotionCycles() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  return useQuery<PromotionCyclesResponse>({
    queryKey: ["promotion-cycles", "END"],
    enabled: isSignedIn && backendConfigured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PromotionCyclesResponse>(
        promotionServiceUrls.promotionCycles("END"),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}

// The lead deadline is evaluated end-of-day in the browser's own timezone —
// same convention PAR's own deadline checks use (par-app and promotion-app
// share the same JwtInterceptor/x-user-timezone-offset backend contract).
// The backend re-checks this itself on every mutating recommendation
// endpoint (save/submit), so a stale clock here can only hide an action
// early, never let one through the server wouldn't have accepted anyway.
//
// `deadline` is a date-only string ("YYYY-MM-DD"). `new Date(deadline)`
// parses that as UTC midnight, not local midnight — in a negative-UTC-offset
// timezone (the Americas), that instant already falls on the PREVIOUS local
// day, so a naive `new Date(deadline).setHours(23,59,59,999)` would mark end
// of the wrong day, hiding this deadline's own actions a day early. Building
// the Date from its own y/m/d components instead uses the local-time
// constructor, which has no such UTC step.
export function isPromotionDeadlinePast(deadline: string | undefined): boolean {
  if (!deadline) return false;
  const [year, month, day] = deadline.split("-").map(Number);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Date.now() > endOfDay.getTime();
}
