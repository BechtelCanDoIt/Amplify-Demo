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

// Wire types for the finance due-diligence questionnaire. Field names here
// follow the backend's actual SQL column aliases (modules/database/db_queries.bal
// — `answer_type_description AS answerTypeDescription`, etc.), NOT the
// `SubQuestionInfoData` record in modules/types/types.bal, whose field names
// (`answerDescription`, `answerFileUpload`) don't match what the query
// actually aliases and returns as JSON.

export interface QuestionCategory {
  categoryId: number;
  categoryName: string;
  sortIndex: number;
}

export interface QuestionInfo {
  questionId: number;
  categoryId: number;
  questionHeading: string;
  questionDescription: string;
  sortIndex: number;
}

export interface SubQuestionInfo {
  subQuestionId: number;
  questionId: number;
  description: string;
  answerType: boolean;
  answerTypeDescription: boolean;
  answerTypeFileUpload: boolean;
  answerRequired: boolean;
  validationRegex: string | null;
  sortIndex: number;
}

export interface PartnerQuestionData {
  questionCategoryInfo: QuestionCategory[];
  questionInfo: QuestionInfo[];
  subQuestionInfo: SubQuestionInfo[];
}

/** One submitted answer — GET .../answers' `answers` field, one entry per (question, sub-question). */
export interface PartnerAnswer {
  companyId: number;
  questionId: number;
  subQuestionId: number;
  booleanAnswer: boolean;
  descriptionAnswer: string;
}

export interface FileSubmission {
  fileId: number;
  companyId: number;
  questionId: number;
  subQuestionId: number;
  fileName: string;
  fileType: string;
}

export interface FinanceComment {
  commentId: number;
  companyId: number;
  questionId: number;
  sortIndex: number;
  userName: string;
  userEmail: string;
  comment: string;
}

export interface FinanceAnswerData {
  answers: PartnerAnswer[];
  files: FileSubmission[];
  comments: FinanceComment[];
  financeSpecialApproval?: string;
}
