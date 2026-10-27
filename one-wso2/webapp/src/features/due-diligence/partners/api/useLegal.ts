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
import type { LegalAnswerData, LegalQuestionData } from "./legalTypes";

/** GET /partners/{id}/questions/legal — the legal question bank (a separate bank from finance's). */
export function useLegalQuestions(companyId: string | number, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<LegalQuestionData>({
    queryKey: ["due-diligence", "legal-questions", companyId],
    enabled: enabled && configured && Boolean(companyId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<LegalQuestionData>(dueDiligenceServiceUrls.legalQuestions(companyId), accessToken);
    },
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
}

const legalAnswersKey = (companyId: string | number) => ["due-diligence", "legal-answers", companyId];

/** GET /partners/{id}/answers/legal — this company's legal answers, comments (with any attached files), and files. */
export function useLegalAnswers(companyId: string | number, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isDueDiligenceBackendConfigured();

  return useQuery<LegalAnswerData>({
    queryKey: legalAnswersKey(companyId),
    enabled: enabled && configured && Boolean(companyId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<LegalAnswerData>(dueDiligenceServiceUrls.legalAnswers(companyId), accessToken);
    },
    retry: httpRetry,
  });
}

export interface LegalApprovalAnswer {
  subQuestionId: number;
  questionId: number;
  booleanAnswer: boolean;
  descriptionAnswer: string;
  companyId: string;
}

/** POST /legal-approval — save the legal opinion's answers (and, for the approval question, the legal result). */
export function useSaveLegalApproval(companyId: string | number) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { answers: LegalApprovalAnswer[]; legalResult: string | null }) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.legalApproval, accessToken, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: legalAnswersKey(companyId) });
    },
  });
}

interface NewPartnerFile {
  companyId: number;
  questionId: number;
  subQuestionId: number | null;
  fileName: string;
  fileType: string;
}

/** POST /legal/comments — add one new comment (optionally with attached files), a single-element array. */
export function useAddLegalComment(companyId: string | number) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      sortIndex: number;
      userEmail: string;
      comment: string;
      questionId: number;
      companyId: number;
      newPartnerFileData?: NewPartnerFile[];
    }) => {
      const accessToken = await getAccessToken();
      return authedPost(dueDiligenceServiceUrls.legalComments, accessToken, [comment]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: legalAnswersKey(companyId) });
    },
  });
}

/** PATCH /legal/comments/{commentId} — edit an existing comment (optionally adding newly-attached files). */
export function useEditLegalComment(companyId: string | number) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      ...payload
    }: {
      commentId: number;
      sortIndex: number;
      userEmail: string;
      comment: string;
      questionId: number;
      companyId: number;
      newPartnerFileData?: NewPartnerFile[];
    }) => {
      const accessToken = await getAccessToken();
      return authedPatch(dueDiligenceServiceUrls.legalComment(commentId), accessToken, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: legalAnswersKey(companyId) });
    },
  });
}
