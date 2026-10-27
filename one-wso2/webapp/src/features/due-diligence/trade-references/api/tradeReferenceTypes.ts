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

// Wire types, transcribed field-for-field from the backend's
// modules/types/types.bal (TradeReferenceData/Info/Links).

import type { PartnerInfoData } from "@features/due-diligence/partners/api/partnerTypes";

export interface TradeReferenceInfo {
  answerId: number;
  companyId: number;
  linkId: number;
  questionId: number;
  subQuestionId: number;
  answer: string;
}

export interface TradeReferenceLinks {
  linkId: number;
  companyId: number;
  email: string;
  companyName: string;
  encodeString: string;
  status: string;
}

export interface TradeReferenceData {
  tradeReferences: TradeReferenceInfo[];
  tradeReferenceLinks: TradeReferenceLinks[];
  resellers: PartnerInfoData[];
}

// The reference-company-name answer, when the form has been filled: sub
// question 27 on the trade-reference questionnaire. Not a magic number of
// convenience — it is literally which sub-question the source database
// schema uses for this field, so it stays a named constant rather than
// getting rediscovered as "27" at the call site.
const COMPANY_NAME_SUBQUESTION_ID = 27;

/** One row in the Trade References table — a link joined with the reseller (partner) it belongs to and, once the form has a company name answer, that answer overriding the link's own placeholder name. */
export interface TradeReferenceRow extends TradeReferenceLinks {
  resellerCompanyName: string;
}

/** GET /trade-references/{companyId}/{linkId} → one trade reference's answers + link info. */
export interface TradeRefData {
  answerId: number;
  companyId: number;
  linkId: number;
  questionId: number;
  subQuestionId: number;
  answer: string;
}

export interface TradeRefLinkInfo {
  linkId: number;
  companyId: number;
  email: string;
  companyName: string;
  status: string;
  encodeString: string;
}

export interface TradeRefLinkData {
  data: TradeRefData[];
  linkData: TradeRefLinkInfo[];
}

// Wire types for GET /trade-references/info/questions — the fixed trade-
// reference questionnaire (category_id = 6). Field names for sub-questions
// follow the backend's actual @sql:Column mappings on SubQuestionInfoData
// (modules/types/types.bal): `answerDescription` / `answerFileUpload`, the
// SAME shape as Legal's sub-questions, NOT Finance's `answerTypeDescription`
// / `answerTypeFileUpload` — the trade-reference query has no column
// aliases, so it binds through the record's own @sql:Column names, which
// happen to match Legal's, not Finance's.

export interface TradeReferenceQuestion {
  questionId: number;
  categoryId: number;
  questionHeading: string;
  questionDescription: string;
  sortIndex: number;
}

export interface TradeReferenceSubQuestion {
  subQuestionId: number;
  questionId: number;
  description: string;
  answerType: boolean;
  answerDescription: boolean;
  answerFileUpload: boolean;
  answerRequired: boolean;
  validationRegex: string | null;
  sortIndex: number;
}

export interface TradeReferenceQuestionData {
  questions: TradeReferenceQuestion[];
  subQuestions: TradeReferenceSubQuestion[];
}

/** Direct port of the `.map` in TradeReferences.js's getTradeReferences(). */
export function joinTradeReferenceLinks(data: TradeReferenceData): TradeReferenceRow[] {
  const { tradeReferences, tradeReferenceLinks, resellers } = data;
  return tradeReferenceLinks.map((link) => {
    const answer = tradeReferences.find(
      (ref) => ref.linkId === link.linkId && ref.subQuestionId === COMPANY_NAME_SUBQUESTION_ID,
    )?.answer;
    const resellerCompanyName = resellers.find((res) => res.companyId === link.companyId)?.companyName ?? "-";
    return { ...link, companyName: answer || link.companyName, resellerCompanyName };
  });
}
