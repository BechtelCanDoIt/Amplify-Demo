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

// Reads from the subscription backend.
//
// Two things shape every hook here.
//
// The subject is a PATH SEGMENT, not just the token. Each subscription query
// takes the email it is about, so the very same hook serves the self-service
// page (the caller's own address) and the admin page (the selected employee's).
// Query keys therefore carry BOTH the signed-in subject and that email —
// `sub` so a different user in the same tab can't be served the previous one's
// rows, and `email` so looking at two employees in a row doesn't show the
// first one's answer for the second.
//
// A 404 is an ANSWER, not a failure. The service 404s when an employee has no
// subscription row at all, which is the ordinary state of anyone who has never
// opted in. Folded into `null` here, so pages branch on data rather than
// having to know which error status means "nothing yet".

import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { HttpError, authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import {
  isSubscriptionBackendConfigured,
  subscriptionServiceUrls,
} from "@config/apiConfig";
import type {
  CommuteSubscription,
  MealSubscription,
  SubscriptionEmployee,
  SubscriptionsMetaInfo,
} from "./subscriptionTypes";

export { isSubscriptionBackendConfigured };

/** Everything every query here needs, gathered once. */
function useSubscriptionQueryBasis() {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const ready = isSignedIn && isSubscriptionBackendConfigured() && Boolean(userSub);
  return { getAccessToken, subState, retryIdentity, userSub, ready };
}

/** GET that treats 404 as "no record", per the note at the top of this file. */
async function getOrNull<T>(url: string, accessToken: string): Promise<T | null> {
  try {
    return await authedGet<T>(url, accessToken);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}

/**
 * GET /subscriptions/meta-info — the price table, the window boundaries, and
 * the two admin group names.
 *
 * Fetched once and shared: React Query dedupes on the key, so the rail's gate,
 * the self-service page and the admin page asking independently still produce
 * one request. Everything it returns is deployment configuration rather than
 * per-employee state, so it is cached for 30 minutes — but it is still keyed
 * per user, because the answer feeds an authorization decision and a cached
 * one must not outlive a sign-out.
 */
export function useSubscriptionsMetaInfo(enabled = true) {
  const { getAccessToken, subState, retryIdentity, userSub, ready } =
    useSubscriptionQueryBasis();
  const query = useQuery<SubscriptionsMetaInfo>({
    queryKey: ["subscription-meta-info", userSub],
    enabled: enabled && ready,
    queryFn: async () =>
      authedGet<SubscriptionsMetaInfo>(subscriptionServiceUrls.metaInfo, await getAccessToken()),
    staleTime: 30 * 60 * 1000,
    retry: httpRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

/** The commute subscription for `email`, or null when there has never been one. */
export function useCommuteSubscription(email: string | undefined) {
  const { getAccessToken, subState, retryIdentity, userSub, ready } =
    useSubscriptionQueryBasis();
  const query = useQuery<CommuteSubscription | null>({
    queryKey: ["subscription-commute", userSub, email],
    enabled: ready && Boolean(email),
    queryFn: async () =>
      getOrNull<CommuteSubscription>(
        subscriptionServiceUrls.commute(email!),
        await getAccessToken(),
      ),
    // Short: this is the thing the page just changed, and a stale answer here
    // is the user being told their own opt-in didn't happen.
    staleTime: 30 * 1000,
    // The app-wide client sets refetchOnMount: false, which would make the
    // staleTime above decorative. Opted back in, as the menu queries do.
    refetchOnMount: true,
    retry: httpRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

/** The meal (LaaS) subscription for `email`, or null. */
export function useMealSubscription(email: string | undefined) {
  const { getAccessToken, subState, retryIdentity, userSub, ready } =
    useSubscriptionQueryBasis();
  const query = useQuery<MealSubscription | null>({
    queryKey: ["subscription-meal", userSub, email],
    enabled: ready && Boolean(email),
    queryFn: async () =>
      getOrNull<MealSubscription>(subscriptionServiceUrls.meal(email!), await getAccessToken()),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    retry: httpRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

/**
 * GET /employees — active and marked-leaver employees, for the admin picker.
 *
 * 403s for anyone in neither admin group, so `enabled` matters: it is passed
 * false until the gate has confirmed the caller is an admin, rather than
 * firing a request we know will be refused and turning an ordinary employee's
 * visit into a console error.
 *
 * Cached for 10 minutes. The roster changes on a hiring cycle, not on a page
 * visit, and the picker re-reads it on the next mount.
 */
export function useSubscriptionEmployees(enabled: boolean) {
  const { getAccessToken, subState, retryIdentity, userSub, ready } =
    useSubscriptionQueryBasis();
  const query = useQuery<SubscriptionEmployee[]>({
    queryKey: ["subscription-employees", userSub],
    enabled: enabled && ready,
    queryFn: async () =>
      authedGet<SubscriptionEmployee[]>(
        subscriptionServiceUrls.employees,
        await getAccessToken(),
      ),
    staleTime: 10 * 60 * 1000,
    retry: httpRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}
