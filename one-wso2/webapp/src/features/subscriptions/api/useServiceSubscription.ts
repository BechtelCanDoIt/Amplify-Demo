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

import type {
  CommuteSubscribePayload,
  CommuteSubscription,
  MealSubscription,
  ServiceDef,
} from "./subscriptionTypes";
import { useCommuteSubscription, useMealSubscription } from "./useSubscriptionData";
import {
  useSubscribeCommute,
  useSubscribeMeal,
  useUnsubscribeCommute,
  useUnsubscribeMeal,
} from "./useSubscriptionMutations";

// One service's state for one person, whoever that person is.
//
// Commute and LaaS are separate endpoints with separate payload shapes, but
// both screens want the same five things about either of them: is this person
// subscribed, is it still loading, did it fail, opt them in, opt them out.
// Collapsing the two into one interface here is what lets the self-service
// card and the admin panel each be written once and rendered per service,
// instead of once per service-and-screen combination.
//
// The `email` argument is the subject, not the caller. That is the whole
// reason this is reusable: the self-service page passes the signed-in user's
// address, the admin page passes the selected employee's, and the backend
// decides which rules apply by comparing that address with the token's own.
//
// Only the matching query is enabled. Asking for the commute subscription
// while rendering a LaaS panel would not merely waste a request — reading
// someone else's commute record requires the COMMUTE admin group, so a
// lunch-only admin would collect a 403 from a service they were never looking
// at.

export interface ServiceSubscription {
  /** The live answer. False both for "opted out" and for "never subscribed". */
  isSubscribed: boolean;
  /** The raw record, for the fields only commute has. Null when there is none. */
  record: CommuteSubscription | MealSubscription | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
  /** True while an opt-in or opt-out is in flight. */
  isSubmitting: boolean;
  /**
   * Opt in. `payload` is required for commute and ignored for LaaS, which has
   * nothing to choose — the caller knows which service it is rendering, so the
   * alternative (two methods, one valid per service) only moves the branch.
   */
  subscribe: (payload?: CommuteSubscribePayload) => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function useServiceSubscription(
  service: ServiceDef,
  email: string | undefined,
): ServiceSubscription {
  const isCommute = service.key === "commute";

  const commuteQuery = useCommuteSubscription(isCommute ? email : undefined);
  const mealQuery = useMealSubscription(isCommute ? undefined : email);
  const query = isCommute ? commuteQuery : mealQuery;

  // All four are created unconditionally — creating a mutation sends nothing,
  // and calling hooks behind a branch would break the rules of hooks.
  const subscribeCommute = useSubscribeCommute();
  const unsubscribeCommute = useUnsubscribeCommute();
  const subscribeMeal = useSubscribeMeal();
  const unsubscribeMeal = useUnsubscribeMeal();

  const subscribeMutation = isCommute ? subscribeCommute : subscribeMeal;
  const unsubscribeMutation = isCommute ? unsubscribeCommute : unsubscribeMeal;

  const record = (query.data ?? null) as CommuteSubscription | MealSubscription | null;

  return {
    // A row exists for anyone who has EVER subscribed, so the flag on the row
    // is the answer — the row's presence is not.
    isSubscribed: Boolean(record?.isSubscribed),
    record,
    // `isLoading` rather than `isPending`: a query disabled because no employee
    // is selected yet is not loading, and treating it as such leaves the admin
    // page spinning on an empty picker.
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    retry: () => void query.refetch(),
    isSubmitting: subscribeMutation.isPending || unsubscribeMutation.isPending,
    subscribe: async (payload?: CommuteSubscribePayload) => {
      if (!email) return;
      if (isCommute) {
        if (!payload) throw new Error("A distance band and contact number are required.");
        await subscribeCommute.mutateAsync({ email, ...payload });
        return;
      }
      await subscribeMeal.mutateAsync({ email });
    },
    unsubscribe: async () => {
      if (!email) return;
      if (isCommute) {
        await unsubscribeCommute.mutateAsync({ email });
        return;
      }
      await unsubscribeMeal.mutateAsync({ email });
    },
  };
}
