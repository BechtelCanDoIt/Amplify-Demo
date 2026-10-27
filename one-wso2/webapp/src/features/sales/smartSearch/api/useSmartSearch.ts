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
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { isSmartSearchBackendConfigured, smartSearchServiceUrls } from "@config/apiConfig";
import type { SmartSearchResponse } from "./smartSearchTypes";

function useSmartSearchBasis() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const ready = isSignedIn && isSmartSearchBackendConfigured() && Boolean(userSub);
  return { getAccessToken, subState, retryIdentity, userSub, ready };
}

/**
 * The matching documents, fetched without the answer so they show first. Keyed by subject too, so a refusal
 * cached for one account never reaches the next. A 4xx is never retried (httpRetry).
 */
export function useSmartSearchSources(query: string) {
  const { getAccessToken, subState, retryIdentity, userSub, ready } = useSmartSearchBasis();
  const result = useQuery<SmartSearchResponse>({
    queryKey: ["smart-search", userSub, "sources", query],
    enabled: ready && query !== "",
    queryFn: async () =>
      authedGet<SmartSearchResponse>(smartSearchServiceUrls.search(query, false), await getAccessToken()),
    staleTime: 60 * 1000,
    retry: httpRetry,
  });
  return foldIdentityError(result, subState, retryIdentity);
}

/**
 * The written answer, fetched after the documents are on screen. The caller checks it was written from the
 * sources shown. A failure is not fatal.
 */
export function useSmartSearchAnswer(query: string, enabled: boolean) {
  const { getAccessToken, userSub, ready } = useSmartSearchBasis();
  return useQuery<SmartSearchResponse>({
    queryKey: ["smart-search", userSub, "answer", query],
    enabled: ready && enabled && query !== "",
    queryFn: async () =>
      authedGet<SmartSearchResponse>(smartSearchServiceUrls.search(query, true), await getAccessToken()),
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
}
