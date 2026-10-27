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

// Wire types for the legal due-diligence questionnaire — a SEPARATE question
// bank from finance's (its own GET .../questions/legal, not the shared
// .../partners/questions). Field names here follow the backend's actual SQL
// column aliases (modules/database/db_queries.bal's getLegalSubQuestionsQuery),
// which for Legal (unlike Finance) match the `LegalSubQuestion` record in
// modules/types/types.bal exactly: `answerDescription` / `answerFileUpload`,
// NOT `answerTypeDescription` / `answerTypeFileUpload` as Finance's do. Don't
// copy Finance's field names here — they're genuinely different backends'
// worth of naming, not a typo.

export interface LegalQuestionCategory {
  categoryId: number;
  categoryName: string;
  sortIndex: number;
}

export interface LegalQuestion {
  questionId: number;
  categoryId: number;
  questionHeading: string;
  questionDescription: string;
  sortIndex: number;
}

export interface LegalSubQuestion {
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

export interface LegalQuestionData {
  questionCategories: LegalQuestionCategory[];
  questions: LegalQuestion[];
  subQuestions: LegalSubQuestion[];
}

/** One submitted legal answer. */
export interface LegalAnswer {
  companyId: number;
  questionId: number;
  subQuestionId: number;
  booleanAnswer: boolean;
  descriptionAnswer: string;
}

export interface LegalFileSubmission {
  fileId: number;
  companyId: number;
  questionId: number;
  subQuestionId: number;
  fileName: string;
  fileType: string;
  /** Present only for files attached to a specific legal comment (question 80's file-upload sub-question). */
  legalCommentId?: number;
}

export interface LegalComment {
  commentId: number;
  companyId: number;
  questionId: number;
  sortIndex: number;
  // No `userName` field — LegalComment is a closed record on the backend
  // (modules/types/types.bal) with no such column, unlike FinanceCommentsData.
  // The source frontend renders `item.userName` here anyway, which is
  // therefore always blank in production; this port uses `userEmail`
  // (genuinely returned) as the display label instead of reproducing that
  // blank-chip bug.
  userEmail: string;
  comment: string;
  createdOn: string;
  updatedOn: string | null;
}

export interface LegalAnswerData {
  answers: LegalAnswer[];
  comments: LegalComment[];
  files: LegalFileSubmission[];
}
