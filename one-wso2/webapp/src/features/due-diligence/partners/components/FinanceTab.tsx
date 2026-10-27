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

import { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, CircularProgress, FormControl, FormControlLabel, Radio, RadioGroup, Stack, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { SPECIAL_APPROVAL_QID } from "@features/due-diligence/constants";
import { usePartnerQuestions } from "../api/useFinance";
import { useFinanceAnswers } from "../api/useFinance";
import FinanceQuestionDetails from "./FinanceQuestionDetails";
import CreditScore from "./CreditScore";

// CREDIT_SCORE_CATEGORY_ID: category 12 embeds the Credit Score calculator
// (CreditScore/CreditScoreChecking/WorkingsForRatios in the source) instead
// of the normal question list.
const CREDIT_SCORE_CATEGORY_ID = 12;
const FINANCIAL_INFO_CATEGORY_ID = 3;

// Ported from the source app's Resellers/ResellerDashboard/Finance/Finance.js.
export default function FinanceTab({
  companyId,
  applicantEmail,
  approvalEmailSent,
  sendingApprovalEmail,
  onSendApprovalEmail,
}: {
  companyId: string;
  applicantEmail: string;
  approvalEmailSent?: boolean;
  sendingApprovalEmail?: boolean;
  onSendApprovalEmail?: () => void;
}) {
  const questions = usePartnerQuestions();
  const answers = useFinanceAnswers(companyId);

  const [closedCategories, setClosedCategories] = useState<Set<number>>(new Set());

  const hasReferenceAnswer = answers.data?.answers.some((a) => a.questionId === 18);
  const selectedRadio: "files" | "references" = hasReferenceAnswer ? "references" : "files";

  const toggleCategory = (sortIndex: number) => {
    setClosedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(sortIndex)) next.delete(sortIndex);
      else next.add(sortIndex);
      return next;
    });
  };

  const financialRadioFilter = (categoryId: number, questionId: number): boolean => {
    if (categoryId !== FINANCIAL_INFO_CATEGORY_ID) return true;
    if (selectedRadio === "files" && questionId === 17) return true;
    if (selectedRadio === "references" && (questionId === 18 || questionId === 19)) return true;
    return false;
  };

  if (questions.isLoading || answers.isLoading) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", p: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading finance questionnaire…
        </Typography>
      </Stack>
    );
  }
  if (questions.isError || answers.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Couldn't load the finance questionnaire. {humanizeHttpError(questions.error ?? answers.error)}</Alert>
      </Box>
    );
  }

  const categories = questions.data?.questionCategoryInfo ?? [];
  const allQuestions = questions.data?.questionInfo ?? [];
  const subQuestions = questions.data?.subQuestionInfo ?? [];
  const specialApproval = answers.data?.financeSpecialApproval ?? "";

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {categories.map((category) => (
          <Accordion
            key={category.categoryId}
            expanded={!closedCategories.has(category.sortIndex)}
            onChange={() => toggleCategory(category.sortIndex)}
          >
            <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
              <Typography sx={{ fontWeight: 700 }}>
                {category.sortIndex - 2}. {category.categoryName}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {category.categoryId === FINANCIAL_INFO_CATEGORY_ID && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    You can either upload audited/unaudited files or reference company details as Financial
                    Information.
                  </Typography>
                  <FormControl disabled>
                    <RadioGroup value={selectedRadio}>
                      <FormControlLabel value="files" control={<Radio size="small" />} label="Upload audited/unaudited files" />
                      <FormControlLabel value="references" control={<Radio size="small" />} label="Submit reference company details" />
                    </RadioGroup>
                  </FormControl>
                </Box>
              )}

              {category.categoryId === CREDIT_SCORE_CATEGORY_ID ? (
                <CreditScore companyId={companyId} />
              ) : (
                allQuestions
                  .filter((q) => q.categoryId === category.categoryId)
                  .filter((q) => q.questionId !== SPECIAL_APPROVAL_QID || specialApproval !== "")
                  .filter((q) => financialRadioFilter(category.categoryId, q.questionId))
                  .map((question) => (
                    <FinanceQuestionDetails
                      key={question.questionId}
                      companyId={companyId}
                      category={category}
                      question={question}
                      subQuestions={subQuestions}
                      answers={answers.data?.answers ?? []}
                      files={answers.data?.files ?? []}
                      comments={answers.data?.comments ?? []}
                      specialApproval={specialApproval}
                      approvalEmailSent={approvalEmailSent}
                      sendingApprovalEmail={sendingApprovalEmail}
                      applicantEmail={applicantEmail}
                      onSendApprovalEmail={onSendApprovalEmail}
                      onFormChanged={() => void answers.refetch()}
                    />
                  ))
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  );
}
