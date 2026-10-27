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
import type { Country, PartnerData, PartnerInfoData } from "./partnerTypes";

export const PARTNERS_QUERY_KEY = ["due-diligence", "partners"];

/** GET /countries — reference data for the "Request Due Diligence" dialog's country select. */
export function useCountries(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<Country[]>({
    queryKey: ["due-diligence", "countries"],
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<Country[]>(dueDiligenceServiceUrls.countries, accessToken);
    },
    staleTime: 60 * 60 * 1000,
    retry: httpRetry,
  });
}

/** POST /partner/link — create a new partner invitation link ("Request Due Diligence"). */
export function useCreatePartnerLink() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      contactEmails: string[];
      companyName: string;
      contactName: string;
      clientUrl: string;
      regionId: number;
      countryId: number;
    }) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.partnerLink, accessToken, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
}

/** GET /partners — every reseller link and its joined profile, unfiltered. */
export function usePartners(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<PartnerData>({
    queryKey: PARTNERS_QUERY_KEY,
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PartnerData>(dueDiligenceServiceUrls.partners, accessToken);
    },
    retry: httpRetry,
  });
}

/** GET /partners/{id} — one reseller's profile data (an array; the backend returns every matching row, in practice at most one). */
export function usePartnerInfo(companyId: string | number, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<PartnerInfoData[]>({
    queryKey: ["due-diligence", "partner", companyId],
    enabled: enabled && configured && Boolean(companyId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<PartnerInfoData[]>(dueDiligenceServiceUrls.partner(companyId), accessToken);
    },
    retry: httpRetry,
  });
}

/** POST /partners/link/{linkId}/renew — extend an expired/expiring link. */
export function useRenewPartnerLink() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: number) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.partnerLinkRenew(linkId), accessToken, {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
}

/** PATCH /partners/{linkId}/link-status — activate/deactivate a partner link. */
export function useChangePartnerLinkStatus() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, status }: { linkId: number; status: "active" | "inactive" }) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.partnerLinkStatusField(linkId), accessToken, { linkId, status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
}

/** PATCH /link-expiry — enable/disable expiry on a partner link. */
export function useChangeLinkExpiry() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, expire }: { linkId: number; expire: boolean }) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.linkExpiry, accessToken, { linkId: String(linkId), expire });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
}

/** PATCH /partners/{linkId} — enable/disable trade reference for a partner. */
export function useUpdatePartner() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, isTradeReferenceEnabled }: { linkId: number; isTradeReferenceEnabled: boolean }) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.partnerUpdate(linkId), accessToken, { isTradeReferenceEnabled });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
      // Also refresh the single-partner query (PartnerDashboardPage's own
      // "Enable/Disable TR" button reads `companyData.isTradeReferenceEnabled`
      // from THAT query, not the list) — same reasoning as the prefix
      // invalidation in useChangePartnerFormStatus just above.
      void queryClient.invalidateQueries({ queryKey: ["due-diligence", "partner"] });
    },
  });
}

/** PATCH /partners/{companyId}/form-status — grant TR-only or full editing access back to a submitted form. */
export function useChangePartnerFormStatus() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      formStatus,
      clientUrl,
    }: {
      companyId: string | number;
      formStatus: string;
      clientUrl: string;
    }) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.partnerFormStatus(companyId), accessToken, {
        formStatus,
        clientUrl,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
      // By prefix, not `["due-diligence", "partner", vars.companyId]`: this
      // mutation's own companyId is always the numeric PartnerInfoData field,
      // but usePartnerInfo is keyed on whatever the caller passed it — in
      // PartnerDashboardPage that's the route param, a string. Comparing
      // those directly silently misses the cached query instead of
      // refreshing it, which is why the "Allow ... Editing" buttons only
      // ever reflected the change after a manual reload.
      void queryClient.invalidateQueries({ queryKey: ["due-diligence", "partner"] });
    },
  });
}

/** GET /partners/{companyId}/approval-summary — finance/legal results and the link's own status. */
export interface ApprovalSummary {
  companyId: number;
  financeResult: string;
  legalResult: string;
  financeSpecialApproval?: string;
}

export interface ApprovalSummaryData {
  summary: ApprovalSummary[];
  resellerLinks: { linkId: number; status: string }[];
}

// No `useApprovalSummary` hook here: ApprovalTab and PartnerDashboardPage
// both call `authedGet(dueDiligenceServiceUrls.approvalSummary(...))`
// directly instead — ApprovalTab deliberately bypasses TanStack Query for
// this endpoint (see its own docstring: it always wants the backend's
// current answer, not a value the shared cache may have from a moment
// before), so a shared query hook here would go unused by the one place
// that mirrors its shape most closely.

/** POST /partners/links/{linkId}/resend-email — edit a link's details and resend the partner/channel-manager emails. */
export function useResendPartnerLinkEmail() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      emails,
      companyName,
      contactName,
      channelManagerEmail,
      clientUrl,
    }: {
      linkId: number;
      emails: string[];
      companyName: string;
      contactName: string;
      channelManagerEmail: string;
      clientUrl: string;
    }) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.partnerLinkResendEmail(linkId), accessToken, {
        emails,
        companyName,
        contactName,
        channelManagerEmail,
        clientUrl,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
    },
  });
}

/** POST /approval-email — notify the special approver that a company is ready for their sign-off. */
export function useSendApprovalEmail() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.approvalEmail, accessToken, { id, name, sentForApproval: 1 });
    },
    onSuccess: () => {
      // Without this, `companyData.sentForApproval` (the flag the button's
      // own disabled/label state is derived from) never refreshes — the
      // button stays clickable after a successful send, and a second click
      // sends a duplicate approval email.
      //
      // Invalidated by prefix, not the specific id: `usePartnerInfo` keys on
      // whatever string/number the caller passed in (PartnerDashboardPage
      // uses the route param, a string; this mutation's own `vars.id` is the
      // numeric companyId) — comparing those two directly would silently
      // miss the cached query instead of refreshing it.
      void queryClient.invalidateQueries({ queryKey: ["due-diligence", "partner"] });
    },
  });
}
