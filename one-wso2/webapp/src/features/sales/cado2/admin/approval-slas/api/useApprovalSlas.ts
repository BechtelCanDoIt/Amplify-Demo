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

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";
import type { ApprovalSlaChange, ApprovalSlaPolicy } from "@features/sales/cado2/approvals/api/approvalTypes";

const DOMAIN = "admin-approval-slas";

/** Each approver role's SLA and the at-risk percentage (Admin). */
export function useApprovalSlas(): UseQueryResult<ApprovalSlaPolicy, Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<ApprovalSlaPolicy, Error>({
    queryKey: key(DOMAIN, "policy"),
    queryFn: async () => authedGet<ApprovalSlaPolicy>(cado2ServiceUrls.adminApprovalSlas, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** The SLA change log, newest first. */
export function useApprovalSlaChanges(): UseQueryResult<ApprovalSlaChange[], Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<ApprovalSlaChange[], Error>({
    queryKey: key(DOMAIN, "changes"),
    queryFn: async () => authedGet<ApprovalSlaChange[]>(cado2ServiceUrls.adminApprovalSlaChanges, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** Saves changed hours and the at-risk percentage; applies to steps that start afterwards. */
export function useSaveApprovalSlas() {
  const { getToken, key } = useCado2Basis();
  const queryClient = useQueryClient();
  return useMutation<ApprovalSlaPolicy, Error, { hours: Record<string, number>; atRiskPercent: number }>({
    mutationFn: async (body) =>
      cado2Send<ApprovalSlaPolicy>("PUT", cado2ServiceUrls.adminApprovalSlas, await getToken(), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(DOMAIN) }),
  });
}
