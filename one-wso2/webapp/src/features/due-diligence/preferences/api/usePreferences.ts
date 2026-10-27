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
import { authedDeleteJson, authedGet, authedPatch, authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { dueDiligenceServiceUrls, isDueDiligenceBackendConfigured } from "@config/apiConfig";

// Wire types, transcribed from modules/types/types.bal.

export interface CreditScoreRatio {
  id: number;
  ratioCategory: string;
  minVal: number | null;
  maxVal: number | null;
  // A string, not a number — the source app treats "" as "not yet set" and
  // validates against that, so it stays a string here too rather than being
  // coerced to a number that can't represent "empty".
  creditScore: string;
}

export interface Ratios {
  ratios: CreditScoreRatio[];
}

export interface NotificationEmail {
  id: number;
  category: string;
  email: string;
}

const PREFERENCES_QUERY_KEY = ["due-diligence", "preferences"];
const NOTIFICATION_EMAILS_QUERY_KEY = ["due-diligence", "notification-emails"];

/** GET /preferences — the credit-score ratio scale table. */
export function usePreferences(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<Ratios>({
    queryKey: PREFERENCES_QUERY_KEY,
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<Ratios>(dueDiligenceServiceUrls.preferences, accessToken);
    },
    retry: httpRetry,
  });
}

/**
 * PATCH /ratio-scales — replace one category's ratio rows. A direct port of
 * RatioTable.js's submit(): each category's table submits only its OWN
 * cloned rows, not the whole scale.
 */
export function useSaveRatioScale() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: CreditScoreRatio[]) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.ratioScales, accessToken, rows);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });
}

/** GET /emails — notification recipients, filtered to the "formsubmit" category (a direct port of EmailPreferences.js's getEmailList()). */
export function useNotificationEmails(enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  const query = useQuery<NotificationEmail[]>({
    queryKey: NOTIFICATION_EMAILS_QUERY_KEY,
    enabled: enabled && configured,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<NotificationEmail[]>(dueDiligenceServiceUrls.notificationEmails, accessToken);
    },
    retry: httpRetry,
  });

  return {
    ...query,
    data: query.data?.filter((e) => e.category === "formsubmit").map((e) => e.email),
  };
}

export function useAddNotificationEmail() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.notificationEmails, accessToken, {
        email,
        category: "formsubmit",
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_EMAILS_QUERY_KEY });
    },
  });
}

export function useDeleteNotificationEmail() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const accessToken = await getAccessToken();
      return authedDeleteJson(dueDiligenceServiceUrls.notificationEmails, accessToken, { email });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_EMAILS_QUERY_KEY });
    },
  });
}
