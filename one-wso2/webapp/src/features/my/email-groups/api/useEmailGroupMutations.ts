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

// Writes to the email-group-manager backend: PATCH one group at a time.
//
// The source app's own bulk actions looped client-side, firing the requests
// one after another and refreshing everything only once the whole batch had
// landed — same shape kept here, but as a `mutateAsync` loop the confirm
// dialog drives (see ConfirmGroupActionDialog), rather than baked into the
// mutation itself. That keeps each PATCH independently retryable/observable
// and the "how many groups" question entirely a caller concern.
//
// Neither mutation invalidates the user-groups query itself — deliberately.
// EmailGroupsPage's handleConfirm is the ONLY caller of either hook (single-
// row and bulk actions both go through it), and it awaits each `mutateAsync`
// in the batch sequentially before moving to the next group. An `onSuccess`
// invalidate here would therefore refire the shared query after EVERY group
// in a batch, not once at the end — exactly the "refresh everything only
// once the whole batch had landed" behaviour this comment already promised
// but the code didn't keep. The page invalidates once, after its loop.
//
// No retry: a 401/403 or a malformed group name is a final answer, not a
// transient one, and this is a caller-initiated write — retrying it silently
// risks a duplicate attempt against a backend with no idempotency key.

import { useMutation } from "@tanstack/react-query";
import { authedPatch } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { emailGroupsServiceUrls } from "@config/apiConfig";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";
import type { GroupSubscriptionPayload } from "./emailGroupTypes";

/**
 * The user-groups query key for the signed-in subject. Exported so the page
 * can invalidate it itself, once, after a whole confirm batch completes.
 */
export function useUserGroupsKey(): unknown[] {
  const { state } = useAsgardeoSub();
  return ["email-groups-user", state.status === "ready" ? state.sub : undefined];
}

export function useSubscribeToGroup() {
  const getAccessToken = useAccessToken();
  return useMutation<void, Error, GroupSubscriptionPayload>({
    mutationFn: async (payload) => {
      await authedPatch<unknown>(emailGroupsServiceUrls.subscribe, await getAccessToken(), payload);
    },
  });
}

export function useUnsubscribeFromGroup() {
  const getAccessToken = useAccessToken();
  return useMutation<void, Error, GroupSubscriptionPayload>({
    mutationFn: async (payload) => {
      await authedPatch<unknown>(
        emailGroupsServiceUrls.unsubscribe,
        await getAccessToken(),
        payload,
      );
    },
  });
}
