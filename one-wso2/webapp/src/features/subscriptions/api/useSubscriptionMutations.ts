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

// Writes to the subscription backend: the four opt-in / opt-out calls.
//
// None of these set `retry`, and that is deliberate rather than an omission.
// React Query's mutation default is zero attempts, which is what these need:
// the two failures that actually happen here are a closed date window (400)
// and a missing admin group (403), and both are final answers. The standalone
// app retried every non-404 up to four times with backoff, so exactly those
// two cases made the user wait through four round trips before being told no.
//
// No toasts in here either. The caller knows whose subscription it is and
// whether it was an opt-in or an opt-out, so it owns the wording — the same
// mutation says "You've opted in to LaaS" on the self-service page and
// "Subscribed Nimal Perera to LaaS" on the admin one.
//
// Every mutation takes the subject's `email`. Passing it explicitly rather
// than reading the signed-in user inside the hook is what lets the admin
// screen reuse these unchanged; the backend decides self-vs-admin by comparing
// that address with the token's own.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { subscriptionServiceUrls } from "@config/apiConfig";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";
import type { CommuteSubscribePayload } from "./subscriptionTypes";

/**
 * Invalidate one subject's rows after a change.
 *
 * Scoped to the email that changed, not to the whole service: an admin who has
 * just subscribed one employee should not have the four other people they
 * looked at this session refetched behind them.
 */
function useInvalidateSubject() {
  const { state } = useAsgardeoSub();
  const userSub = state.status === "ready" ? state.sub : undefined;
  const qc = useQueryClient();
  return async (key: "subscription-commute" | "subscription-meal", email: string) => {
    await qc.invalidateQueries({ queryKey: [key, userSub, email] });
  };
}

export interface CommuteSubscribeVars extends CommuteSubscribePayload {
  email: string;
}

/** POST /commutes/{email}/subscribe. */
export function useSubscribeCommute() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidateSubject();
  return useMutation<void, Error, CommuteSubscribeVars>({
    mutationFn: async ({ email, distanceRangeId, contactNumber }) => {
      await authedPost<number>(
        subscriptionServiceUrls.subscribeCommute(email),
        await getAccessToken(),
        { distanceRangeId, contactNumber },
      );
    },
    onSuccess: async (_data, { email }) => {
      await invalidate("subscription-commute", email);
    },
  });
}

/** POST /commutes/{email}/unsubscribe. Carries no body. */
export function useUnsubscribeCommute() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidateSubject();
  return useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      await authedPost<number>(
        subscriptionServiceUrls.unsubscribeCommute(email),
        await getAccessToken(),
        // The resource takes no payload; an empty object keeps the request
        // well-formed JSON rather than sending the literal "undefined".
        {},
      );
    },
    onSuccess: async (_data, { email }) => {
      await invalidate("subscription-commute", email);
    },
  });
}

/** POST /meal/{email}/subscribe. LaaS has no options to choose. */
export function useSubscribeMeal() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidateSubject();
  return useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      await authedPost<number>(
        subscriptionServiceUrls.subscribeMeal(email),
        await getAccessToken(),
        {},
      );
    },
    onSuccess: async (_data, { email }) => {
      await invalidate("subscription-meal", email);
    },
  });
}

/** POST /meal/{email}/unsubscribe. */
export function useUnsubscribeMeal() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidateSubject();
  return useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      await authedPost<number>(
        subscriptionServiceUrls.unsubscribeMeal(email),
        await getAccessToken(),
        {},
      );
    },
    onSuccess: async (_data, { email }) => {
      await invalidate("subscription-meal", email);
    },
  });
}
