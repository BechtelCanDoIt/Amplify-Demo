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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { authedGet, authedPatch, defaultQueryRetry } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { promotionServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";
import { isPromotionBackendConfigured } from "./usePromotionEmployeeInfo";
import type { PromotionRequestsResponse } from "./types";

const REQUESTS_KEY = "promotion-requests";

export interface PromotionRequestsParams {
  statusArray?: string[];
  enableBuFilter?: boolean;
  type?: "NORMAL" | "SPECIAL" | "TIME_BASED" | "INDIVIDUAL_CONTRIBUTOR";
  cycleId?: number;
  employeeEmail?: string;
}

// GET /promotion/requests — every Functional Lead Portal tab reads this,
// varying params (source's own four separate service-url constants
// collapse to the same resource with different query strings).
export function usePromotionRequests(params: PromotionRequestsParams, enabled = true) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = isPromotionBackendConfigured();
  return useQuery<PromotionRequestsResponse>({
    queryKey: [REQUESTS_KEY, params],
    enabled: enabled && isSignedIn && backendConfigured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PromotionRequestsResponse>(
        promotionServiceUrls.promotionRequests(params),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 30 * 1000,
    retry: defaultQueryRetry,
  });
}

function useInvalidatePromotionRequests() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [REQUESTS_KEY] });
}

// Thrown by settleBulkRequest when SOME (not all) ids failed — carries the
// failed ids as actual data, not just baked into the message string, so a
// caller can re-select exactly those for a retry instead of either the
// whole original batch (re-hitting the ones that already succeeded) or
// nothing at all (losing track of which ones still need it).
export class PartialBulkFailureError extends Error {
  readonly failedIds: number[];
  constructor(failedIds: number[], totalCount: number) {
    const plural = failedIds.length > 1;
    super(
      `${failedIds.length} of ${totalCount} request${totalCount > 1 ? "s" : ""} failed (id${plural ? "s" : ""} ${failedIds.join(", ")}). The rest were processed.`,
    );
    this.name = "PartialBulkFailureError";
    this.failedIds = failedIds;
  }
}

// Fans a bulk action out over every id with Promise.allSettled rather than
// Promise.all: a single rejected promise from Promise.all would abort the
// whole batch's error handling while the OTHER requests it raced against
// still commit on the server — silently leaving the cache stale about rows
// that did in fact change. allSettled lets every id run to completion
// regardless, and this throws afterward (naming which ids failed) only if
// at least one did — the caller's onSettled still fires either way, so a
// partial failure still invalidates and refetches the true server state.
async function settleBulkRequest(ids: number[], run: (id: number) => Promise<unknown>): Promise<void> {
  const results = await Promise.allSettled(ids.map(run));
  const failedIds = ids.filter((_, i) => results[i].status === "rejected");
  if (failedIds.length > 0) {
    throw new PartialBulkFailureError(failedIds, ids.length);
  }
}

// GET .../requests/{id}/approve?from=. Also accepts a list of ids —
// source's own approveFLPromotionRequestList thunk is just Promise.all
// over the single-approve endpoint (no real bulk endpoint exists), so this
// mutation does the same fan-out (see settleBulkRequest's own comment for
// why allSettled, not source's plain Promise.all).
export function useApprovePromotionRequests(from: "functional_lead" | "promotion_board") {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidatePromotionRequests();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const accessToken = await getAccessToken();
      await settleBulkRequest(ids, (id) =>
        authedGet(promotionServiceUrls.promotionRequestApprove(id, from), accessToken, digiopsHeaders()),
      );
    },
    onSettled: () => invalidate(),
  });
}

export function useRejectPromotionRequests(from: "functional_lead" | "promotion_board") {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidatePromotionRequests();
  return useMutation({
    mutationFn: async (payload: { ids: number[]; reason: string }) => {
      const accessToken = await getAccessToken();
      await settleBulkRequest(payload.ids, (id) =>
        authedGet(
          promotionServiceUrls.promotionRequestReject(id, from, payload.reason),
          accessToken,
          digiopsHeaders(),
        ),
      );
    },
    onSettled: () => invalidate(),
  });
}

// PATCH /promotion/requests — the job-band edit dialog (Active tab only).
export function useUpdatePromotionRequestJobBand() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidatePromotionRequests();
  return useMutation({
    mutationFn: async (payload: { id: number; promotingJobBand: number; promotedJobRole?: string }) => {
      const accessToken = await getAccessToken();
      return authedPatch(promotionServiceUrls.promotionRequestUpdate(), accessToken, payload, digiopsHeaders());
    },
    onSuccess: () => invalidate(),
  });
}

// PATCH /promotion/requests — same endpoint as the job-band edit above,
// different fields. The Admin Portal's Individual Contributor tab's own
// "edit the declined reason after the fact" action.
export function useUpdatePromotionRequestRejectionReason() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidatePromotionRequests();
  return useMutation({
    mutationFn: async (payload: { id: number; reasonForRejection: string }) => {
      const accessToken = await getAccessToken();
      return authedPatch(promotionServiceUrls.promotionRequestUpdate(), accessToken, payload, digiopsHeaders());
    },
    onSuccess: () => invalidate(),
  });
}

// GET .../requests/{id}/send-email-notification?effectiveDate= — the Admin
// Portal's Notification Hub, manually sending the outcome email for a
// request whose automatic notification hasn't gone out yet. effectiveDate
// is only meaningful for an APPROVED request (see PromotionRequestNotifyPayload's
// own comment where it's built); omit it for REJECTED/FL_REJECTED.
export interface PromotionRequestNotifyPayload {
  id: number;
  effectiveDate?: string;
}

export function useNotifyPromotionRequest() {
  const getAccessToken = useAccessToken();
  const invalidate = useInvalidatePromotionRequests();
  return useMutation({
    mutationFn: async (payload: PromotionRequestNotifyPayload) => {
      const accessToken = await getAccessToken();
      return authedGet(
        promotionServiceUrls.promotionRequestNotify(payload.id, payload.effectiveDate),
        accessToken,
        digiopsHeaders(),
      );
    },
    onSuccess: () => invalidate(),
  });
}
