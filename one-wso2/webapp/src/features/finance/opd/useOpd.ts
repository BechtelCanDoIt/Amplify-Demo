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
import { authedGet, authedPost, HttpError } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isOpdBackendConfigured, opdServiceUrls } from "@config/apiConfig";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { financeRetry } from "../util/financeError";
import type {
  OpdAppData,
  OpdClaim,
  OpdClaimSearchPayload,
  OpdEmployee,
  OpdUserInfo,
} from "./opdTypes";

export { isOpdBackendConfigured };

// GET /user-info — the OPD role scheme (userRoles: 444 submitter / 555
// finance). Keyed per-user so an account switch can't leak.
//
// A 403 here is an ANSWER, not a failure: the backend replying "You are not
// authorized to access opd claims app" is telling us, definitively, that this
// person holds no OPD role. It is folded into an empty role list rather than
// thrown, and the reason is not tidiness — it is the number of requests this
// app makes.
//
// React Query's `staleTime` only protects data that ARRIVED. An errored query
// has no data, so there is nothing to serve a later subscriber from, and every
// component that mounts and asks for this query fires a fresh request —
// `refetchOnMount: false` does not stop it, because this is not a refetch, it
// is the first fetch as far as that observer is concerned. Measured directly
// against this React Query (5.90.20): three mounts of the same errored query
// produced three network calls, not one.
//
// Seven components call this hook, and the finance rail calls it again. So for
// anyone without OPD access — most of the company — every move between finance
// screens produced another 403, which is what "it constantly retries the OPD
// backend for user-info even though the user has no permissions" was. As a
// cached success it is asked once per `staleTime` and then left alone.
//
// Only 403 — every other failure stays a real error with a real retry, because
// "the server is broken" and "you are not an OPD user" are different answers
// and must not be flattened into each other.
export function useOpdUserInfo(enabled = true) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isOpdBackendConfigured();
  const query = useQuery<OpdUserInfo>({
    queryKey: ["opd-user-info", userSub],
    enabled: enabled && isSignedIn && configured && Boolean(userSub),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      try {
        return await authedGet<OpdUserInfo>(opdServiceUrls.userInfo, accessToken);
      } catch (error: unknown) {
        // No name to show either, which is correct: the backend told us
        // nothing about this person beyond the fact that they are not one of
        // its users. Every reader of this hook asks it about `userRoles`.
        if (error instanceof HttpError && error.status === 403) {
          return { firstName: "", lastName: "", workEmail: "", userRoles: [] };
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: financeRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

// GET /app-data — claim summary (limit/remaining) + any saved draft.
export function useOpdAppData() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isOpdBackendConfigured();
  const query = useQuery<OpdAppData>({
    queryKey: ["opd-app-data", userSub],
    enabled: isSignedIn && configured && Boolean(userSub),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<OpdAppData>(opdServiceUrls.appData, accessToken);
    },
    staleTime: 60 * 1000,
    retry: financeRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

// POST /search-claims — the list endpoint for both History (own claims) and
// Approvals (all claims). `enabled` defers until a filter is ready.
export function useOpdClaims(payload: OpdClaimSearchPayload, enabled = true) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isOpdBackendConfigured();
  const query = useQuery<OpdClaim[]>({
    // Scope per user — a search with no explicit email resolves the caller
    // from the token, so two users would otherwise share one cache entry.
    queryKey: ["opd-claims", userSub, payload],
    enabled: enabled && isSignedIn && configured && Boolean(userSub),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const res = await authedPost<OpdClaim[]>(opdServiceUrls.searchClaims, accessToken, payload);
      return res ?? [];
    },
    staleTime: 60 * 1000,
    retry: financeRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

// GET /employees — for resolving approver-view user names/avatars.
export function useOpdEmployees(enabled = true) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isOpdBackendConfigured();
  const query = useQuery<OpdEmployee[]>({
    queryKey: ["opd-employees", userSub],
    enabled: enabled && isSignedIn && configured && Boolean(userSub),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<OpdEmployee[]>(opdServiceUrls.employees, accessToken);
    },
    staleTime: 10 * 60 * 1000,
    retry: financeRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}
