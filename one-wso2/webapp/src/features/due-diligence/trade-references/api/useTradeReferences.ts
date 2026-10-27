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
import { authedGet, authedPatch, authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { dueDiligenceServiceUrls, isDueDiligenceBackendConfigured } from "@config/apiConfig";
import type { TradeReferenceData, TradeReferenceQuestionData, TradeRefLinkData } from "./tradeReferenceTypes";

const TRADE_REFERENCES_QUERY_KEY = ["due-diligence", "trade-references"];

/** GET /trade-references/info/questions — the fixed trade-reference questionnaire (question bank + sub-questions), shared by every trade-reference page. */
export function useTradeReferenceQuestions(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<TradeReferenceQuestionData>({
    queryKey: ["due-diligence", "trade-reference-questions"],
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<TradeReferenceQuestionData>(dueDiligenceServiceUrls.tradeReferenceQuestions, accessToken);
    },
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
}

/** GET /trade-references — every trade-reference link, its answers, and the resellers they belong to. */
export function useTradeReferences(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<TradeReferenceData>({
    queryKey: TRADE_REFERENCES_QUERY_KEY,
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<TradeReferenceData>(dueDiligenceServiceUrls.tradeReferences, accessToken);
    },
    retry: httpRetry,
  });
}

/** GET /trade-references/{companyId}/{linkId} — one trade reference's answers + link info. */
export function useTradeReferenceDetail(companyId: string | number, linkId: string | number, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<TradeRefLinkData>({
    queryKey: ["due-diligence", "trade-reference", companyId, linkId],
    enabled: enabled && configured && Boolean(companyId) && Boolean(linkId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<TradeRefLinkData>(dueDiligenceServiceUrls.tradeReference(companyId, linkId), accessToken);
    },
    retry: httpRetry,
  });
}

/**
 * PATCH /trade-reference/form-status — change a trade reference's status
 * (used to deactivate/reactivate). `clientUrl` comes from the due-diligence
 * backend's own GET /app-config (see useCopyClientLink) rather than a
 * hardcoded value — same reasoning as "Copy Link".
 */
export function useUpdateTradeReferenceFormStatus() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      formStatus,
      clientUrl,
    }: {
      linkId: number;
      formStatus: string;
      clientUrl: string;
    }) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.tradeReferenceFormStatus, accessToken, {
        linkId,
        formStatus,
        clientUrl,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRADE_REFERENCES_QUERY_KEY });
      // Also covers `useTradeReferenceDetail` (keyed by prefix, not the exact
      // companyId/linkId pair passed in here) — without this, navigating
      // straight to the dashboard page for this trade reference after an
      // activate/deactivate would still show the pre-change status.
      void queryClient.invalidateQueries({ queryKey: ["due-diligence", "trade-reference"] });
    },
  });
}

/** POST /trade-references/link/{linkId}/renew — extend an expiring link. */
export function useRenewTradeReferenceLink() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: number) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.tradeReferenceLinkRenew(linkId), accessToken, {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRADE_REFERENCES_QUERY_KEY });
    },
  });
}
