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
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpRetry } from "@api/errors";
import { authedPost, authedPut, fetchWithReauth, HttpError } from "@api/http";
import { isUmtBackendConfigured, umtServiceUrls } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { UMT_PR_ANALYSIS_STATUS } from "./umtTypes";
import type { UmtPullRequestAnalysisRequest } from "./umtUpdates";

// Despite an `application/json` content-type, this endpoint's body is a bare,
// unquoted status word (e.g. `COMPLETED`, not `"COMPLETED"`) — not valid
// JSON. authedGet's JSON.parse would throw on every single call, silently
// failing every poll and leaving the query stuck on its seeded initialData.
// Read the body as plain text instead, mirroring authedPostText's approach
// for a non-JSON response body.
async function fetchPrAnalysisStatus(url: string, accessToken: string): Promise<string> {
  const res = await fetchWithReauth(url, {}, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(url, res.status, body);
  }
  return (await res.text()).trim();
}

// First refetchInterval (polling) usage in this app. Seeded with the status
// already known from GET /update/{id} (`praStatus`) so the step shows it
// immediately on mount, then polls every 3s while in flight, stopping itself
// once the status is terminal.
//
// No "awaiting confirmation" grace flag is needed here: the real backend's
// start-analysis POST (UpdateManagerHelper#pullRequestAnalysisSubmit) sets
// praStatus to QUEUED inside a synchronous, committed JPA transaction before
// the POST even returns, and the status GET (UpdateManager#getPrAnalysisStatus)
// reads that same row fresh on every call — verified directly against the
// backend source. So the query invalidation the start-analysis mutation
// fires on success is guaranteed to refetch an already-QUEUED status; there
// is no race window where a stale pre-analysis read could be mistaken for
// confirmation (an earlier version of this hook carried such a flag to
// guard against exactly that race, which turned out not to exist).
export function useUmtPrAnalysisStatus(
  id: string,
  initialStatus: string | null | undefined,
  enabled: boolean,
) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const queryClient = useQueryClient();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const baseEnabled =
    /^\d+$/.test(id) && isSignedIn && isUmtBackendConfigured() && Boolean(userSub);
  const queryKey = ["umt-update-pr-analysis-status", userSub, id];

  const query = useQuery<string>({
    queryKey,
    enabled: baseEnabled && enabled,
    initialData: initialStatus ?? undefined,
    queryFn: async () => {
      // Read the cached status *before* this fetch overwrites it, so we can
      // tell a fresh QUEUED/PROCESSING -> COMPLETED transition (which needs a
      // results refetch) apart from a mount that already finds the status
      // COMPLETED (nothing changed, no need to refetch results again).
      const previousStatus = queryClient.getQueryData<string>(queryKey);
      const status = await fetchPrAnalysisStatus(
        umtServiceUrls.updatePullRequestAnalysisStatus(id),
        await getAccessToken(),
      );
      if (status === UMT_PR_ANALYSIS_STATUS.COMPLETED && previousStatus !== UMT_PR_ANALYSIS_STATUS.COMPLETED) {
        void queryClient.invalidateQueries({ queryKey: ["umt-update-pull-request-analysis"] });
        // The update's own praStatus is what moves it on to PRAnalyzed.
        void queryClient.invalidateQueries({ queryKey: ["umt-update"] });
      }
      return status;
    },
    refetchInterval: (query) => {
      const status = query.state.data;
      const inFlight = status === UMT_PR_ANALYSIS_STATUS.QUEUED || status === UMT_PR_ANALYSIS_STATUS.PROCESSING;
      return inFlight ? 3000 : false;
    },
    retry: httpRetry,
  });

  return foldIdentityError(query, subState, retryIdentity);
}

export function useUmtStartPullRequestAnalysis(id: string) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UmtPullRequestAnalysisRequest>({
    mutationFn: async (payload) => {
      const accessToken = await getAccessToken();
      await authedPost(umtServiceUrls.updatePullRequestAnalysis(id), accessToken, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["umt-update-pr-analysis-status"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-update-pull-request-analysis"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-update"] }),
      ]);
    },
  });
}

// Thrown when the update was promoted to PRAnalyzed but its product analysis
// failed. The promotion is rolled back to Development, so a half-analyzed
// update never sits in PRAnalyzed; `rolledBack` says whether that worked.
export class UmtProductAnalysisFailedError extends Error {
  constructor(
    public readonly rolledBack: boolean,
    public readonly analysisError: unknown,
    public readonly rollbackError?: unknown,
  ) {
    super(
      rolledBack
        ? "Product analysis failed, so the update was moved back to Development. Run Analyze again."
        : "Product analysis failed, and moving the update back to Development also failed. Use " +
            '"Demote to Development", then run Analyze again.',
    );
    this.name = "UmtProductAnalysisFailedError";
  }
}

const advanceToPrAnalyzedKey = (id: string) => ["umt-advance-to-pr-analyzed", id];

// Promotes the update to PRAnalyzed, then runs its product analysis, then
// invalidates the relevant queries to pick up results. `lifecycleState:
// "PRAnalyzed"` is hardcoded here (rather than sent from the backend's
// promoteStages[0], as most later transitions do) since it's the fixed first
// step out of Development. If the promotion itself fails the update never
// left Development, so there is nothing to roll back. Invalidation runs in
// onSettled (not onSuccess) so the page re-reads wherever the update ended up.
export function useUmtProceedFromPrAnalysis(id: string) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationKey: advanceToPrAnalyzedKey(id),
    mutationFn: async () => {
      const accessToken = await getAccessToken();
      await authedPut(umtServiceUrls.update(id), accessToken, { lifecycleState: "PRAnalyzed" });
      try {
        await authedPost(umtServiceUrls.updateProductAnalysis(id), accessToken, {});
      } catch (analysisError) {
        try {
          await authedPut(umtServiceUrls.update(id), accessToken, { lifecycleState: "Development" });
        } catch (rollbackError) {
          throw new UmtProductAnalysisFailedError(false, analysisError, rollbackError);
        }
        throw new UmtProductAnalysisFailedError(true, analysisError);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["umt-update"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-updates"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-update-lifecycle-history"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-update-product-analysis"] }),
        // A rollback to Development resets the PR analysis status.
        queryClient.invalidateQueries({ queryKey: ["umt-update-pr-analysis-status"] }),
      ]);
    },
  });
}

/** True while useUmtProceedFromPrAnalysis is promoting update `id` and running its product analysis. */
export function useUmtIsAdvancingToPrAnalyzed(id: string): boolean {
  return useIsMutating({ mutationKey: advanceToPrAnalyzedKey(id) }) > 0;
}

// Mirrors financeReceipts.ts's uploadReceipt: calls fetchWithReauth directly
// with a non-JSON body instead of going through the shared JSON helpers.
// When there's no local file (an SVN-location- or GitHub-raw-URL-only
// source), the caller passes a small placeholder blob — the backend already
// expects a `file` part on every call regardless of source.
//
// The backend stores the upload under the `file` part's filename and ignores
// the `relativePath` field, so `filePath` — the path the PR analysis request
// will later reference — must be sent as that filename. Otherwise the file
// lands at its bare name and the analysis fails with "File does not exist in
// UMT-container" (the Java and ui-revamp UIs both sent the full path).
export function useUmtUploadPullRequestAnalysisFile(id: string) {
  const getAccessToken = useAccessToken();

  return useMutation<
    void,
    Error,
    { relativePath: string; sourceFilePath: string; file: File | Blob; filePath?: string }
  >({
    mutationFn: async ({ relativePath, sourceFilePath, file, filePath }) => {
      const accessToken = await getAccessToken();
      const url = umtServiceUrls.updatePullRequestAnalysisFile(id);
      const formData = new FormData();
      formData.append("relativePath", relativePath);
      formData.append("id", id);
      formData.append("sourceFilePath", sourceFilePath);
      if (filePath) {
        formData.append("file", file, filePath);
      } else {
        formData.append("file", file);
      }

      const res = await fetchWithReauth(url, { method: "POST", body: formData }, accessToken);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(url, res.status, body);
      }
    },
  });
}
