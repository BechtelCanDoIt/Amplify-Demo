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

import { Box, Typography } from "@wso2/oxygen-ui";
import type { TradeReferenceInfo, TradeReferenceQuestion, TradeReferenceSubQuestion } from "../api/tradeReferenceTypes";
import TradeReferenceSubQuestionDetails from "./TradeReferenceSubQuestionDetails";

// Sub-questions in this specific range render at half width on large
// screens (source's `getRenderBreakpoint`'s `[30, 31, 32, 33, 34, 35]` list,
// `lg={6}`); every other sub-question is full width (`lg={12}`).
const HALF_WIDTH_SUBQUESTION_IDS = new Set([30, 31, 32, 33, 34, 35]);

/**
 * Ported from the source app's TradeReferences/TradeReferenceDashboard/QuestionDetails.js
 * — always read-only in the admin view (the source always passes
 * `formCompleted={true}` into the sub-question renderer it calls).
 */
export default function TradeReferenceQuestionDetails({
  question,
  subQuestions,
  answers,
}: {
  question: TradeReferenceQuestion;
  subQuestions: TradeReferenceSubQuestion[];
  answers: TradeReferenceInfo[];
}) {
  const relevantSubQuestions = subQuestions.filter((sq) => sq.questionId === question.questionId);

  return (
    <Box sx={{ mt: 1.5 }}>
      {question.questionHeading !== "" && (
        <Typography variant="body2" sx={{ textAlign: "justify" }}>
          {question.questionHeading}
        </Typography>
      )}
      {question.questionDescription !== "" && <Typography sx={{ mt: 0.5 }}>{question.questionDescription}</Typography>}

      {relevantSubQuestions.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mt: 1.5 }}>
          {relevantSubQuestions.map((sq) => (
            <Box key={sq.subQuestionId} sx={{ gridColumn: HALF_WIDTH_SUBQUESTION_IDS.has(sq.subQuestionId) ? "span 1" : "1 / -1" }}>
              <TradeReferenceSubQuestionDetails subQuestion={sq} answer={answers.find((a) => a.subQuestionId === sq.subQuestionId)} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
