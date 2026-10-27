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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useAsgardeo } from "@asgardeo/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpRetry } from "@api/errors";
import { authedGet, authedPost, HttpError } from "@api/http";
import { isUmtBackendConfigured, umtServiceUrls } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { umtHotfixTestsRunning, type UmtHotfixTestStatus } from "../lib/umtHotfixRelease";

const HOTFIX_TEST_STATUS_KEY = "umt-hotfix-test-status";

// Shared by the shell (release gating) and the hotfix release step (its own
// render) — same query key, so TanStack dedupes the fetch. Only asked at
// TestingEnvironmentCreated, the one state a hotfix is released from; polls
// every 5s while a run is in progress, so the status updates without a reload.
export function useUmtHotfixTestStatus(id: string, lifecycleState: string | null | undefined) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const enabled =
    /^\d+$/.test(id) &&
    isSignedIn &&
    isUmtBackendConfigured() &&
    Boolean(userSub) &&
    lifecycleState === "TestingEnvironmentCreated";

  const query = useQuery<UmtHotfixTestStatus>({
    queryKey: [HOTFIX_TEST_STATUS_KEY, userSub, id],
    enabled,
    queryFn: async () => {
      try {
        const status = await authedGet<{ buildStatus?: string | null }>(
          umtServiceUrls.updateHotfixJenkinsJobStatus(id),
          await getAccessToken(),
        );
        return status.buildStatus || null;
      } catch (error) {
        // A 400 means no run has been started yet: a state, not a failure.
        if (error instanceof HttpError && error.status === 400) return null;
        throw error;
      }
    },
    refetchInterval: (q) => (umtHotfixTestsRunning(q.state.data ?? null) ? 5000 : false),
    retry: httpRetry,
  });

  return foldIdentityError(query, subState, retryIdentity);
}

export function useUmtTriggerHotfixTests(id: string) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await authedPost(umtServiceUrls.updateHotfixJenkinsJobTrigger(id), await getAccessToken(), {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [HOTFIX_TEST_STATUS_KEY] });
    },
  });
}

// Releases the hotfix (TestingEnvironmentCreated → Released). `reason` is
// null when the integration tests passed; otherwise a reason is required, and
// only a lead or admin can release.
export function useUmtReleaseHotfix(id: string) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string | null>({
    mutationFn: async (reason) => {
      await authedPost(umtServiceUrls.updateReleaseHotfix(id), await getAccessToken(), { reason });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["umt-update"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-updates"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-update-lifecycle-history"] }),
      ]);
    },
  });
}
