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

import { TextField } from "@wso2/oxygen-ui";
import type { TradeReferenceInfo, TradeReferenceSubQuestion } from "../api/tradeReferenceTypes";

const ADDITIONAL_COMMENTS_SUBQUESTION_ID = 38;
const REJECT_REASON_SUBQUESTION_ID = 93;

/**
 * Ported from the source app's TradeReferences/TradeReferenceDashboard/SubQuestionDetails.js.
 *
 * Unlike Finance's and Legal's sub-question renderers, this one has no
 * boolean/radio branch and no file-upload branch — every trade-reference
 * sub-question is a plain description field, and the admin view is always
 * read-only (the source always passes `formCompleted={true}` here).
 */
export default function TradeReferenceSubQuestionDetails({
  subQuestion,
  answer,
}: {
  subQuestion: TradeReferenceSubQuestion;
  answer?: TradeReferenceInfo;
}) {
  const isLongAnswer =
    subQuestion.subQuestionId === ADDITIONAL_COMMENTS_SUBQUESTION_ID ||
    subQuestion.subQuestionId === REJECT_REASON_SUBQUESTION_ID;

  return (
    <TextField
      size="small"
      label={subQuestion.description}
      disabled
      fullWidth
      value={answer?.answer ?? ""}
      multiline={isLongAnswer}
      maxRows={isLongAnswer ? 30 : 1}
    />
  );
}
