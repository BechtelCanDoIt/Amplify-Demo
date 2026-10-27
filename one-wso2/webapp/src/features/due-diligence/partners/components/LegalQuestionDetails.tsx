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
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from "@wso2/oxygen-ui";
import { humanizeHttpError } from "@api/http";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import {
  LEGAL_APPROVAL_QUESTION_ID,
  LEGAL_CHOOSE_FILE_SUBQUESTION_ID,
  LEGAL_COMMENT_QUESTION_ID,
  LEGAL_OPINION_CATEGORY_ID,
  LEGAL_RESULT_SUB_QID,
} from "@features/due-diligence/constants";
import LegalSubQuestionDetails from "./LegalSubQuestionDetails";
import LegalCommentInputs from "./LegalCommentInputs";
import { useSaveLegalApproval, type LegalApprovalAnswer } from "../api/useLegal";
import type { LegalAnswer, LegalComment, LegalFileSubmission, LegalQuestion, LegalSubQuestion } from "../api/legalTypes";

/**
 * Ported from the source app's Resellers/ResellerDashboard/Legal/QuestionDetails.js.
 *
 * `categoryDisabled` (true for "Legal Documents"/"Legal Information", false
 * for "Legal Opinion") is the source's per-category `disabled` prop — those
 * two categories are always read-only regardless of role.
 */
export default function LegalQuestionDetails({
  companyId,
  applicantEmail,
  categoryId,
  categoryDisabled,
  question,
  subQuestions,
  answers,
  files,
  comments,
  onFormChanged,
}: {
  companyId: string;
  applicantEmail: string;
  categoryId: "1" | "2" | "3";
  categoryDisabled: boolean;
  question: LegalQuestion;
  subQuestions: LegalSubQuestion[];
  answers: LegalAnswer[];
  files: LegalFileSubmission[];
  comments: LegalComment[];
  onFormChanged: () => void;
}) {
  const gate = useDueDiligenceGate();
  const saveApproval = useSaveLegalApproval(companyId);

  const [editing, setEditing] = useState(false);
  const [draftAnswers, setDraftAnswers] = useState<Map<number, LegalApprovalAnswer>>(new Map());
  const [legalResultAnswer, setLegalResultAnswer] = useState<boolean | undefined>(undefined);
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const relevantSubQuestions = subQuestions.filter((sq) => sq.questionId === question.questionId);
  const attachSubQuestion = subQuestions.find((sq) => sq.subQuestionId === LEGAL_CHOOSE_FILE_SUBQUESTION_ID);

  const onAnswered = (subQuestionId: number, booleanAnswer: boolean | "", descriptionAnswer: string, isValid: boolean) => {
    if (subQuestionId === LEGAL_RESULT_SUB_QID) setLegalResultAnswer(booleanAnswer === "" ? undefined : booleanAnswer);
    setDraftAnswers((prev) => {
      const next = new Map(prev);
      if (isValid) {
        next.set(subQuestionId, {
          subQuestionId,
          questionId: question.questionId,
          booleanAnswer: Boolean(booleanAnswer),
          descriptionAnswer,
          companyId,
        });
      } else {
        next.delete(subQuestionId);
      }
      return next;
    });
  };

  const isValid = draftAnswers.size > 0;

  const save = () => {
    saveApproval.mutate(
      {
        answers: Array.from(draftAnswers.values()),
        legalResult: legalResultAnswer === true ? "approved" : legalResultAnswer === false ? "rejected" : null,
      },
      {
        onSuccess: () => {
          setEditing(false);
          setDraftAnswers(new Map());
          onFormChanged();
        },
        onError: (err) => setSnack({ open: true, severity: "error", message: humanizeHttpError(err) }),
      },
    );
  };

  const showSaveEdit =
    categoryId === LEGAL_OPINION_CATEGORY_ID && gate.hasRole("legalApprover") && question.questionId === LEGAL_APPROVAL_QUESTION_ID;

  return (
    <Box sx={{ mb: 2 }}>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {question.questionHeading}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {categoryId}.{question.sortIndex} {question.questionDescription}
      </Typography>

      {relevantSubQuestions.map((sq) => (
        <LegalSubQuestionDetails
          key={sq.subQuestionId}
          categoryId={categoryId}
          question={question}
          subQuestion={sq}
          answer={answers.find((a) => a.subQuestionId === sq.subQuestionId)}
          files={files}
          fieldDisabled={categoryDisabled || !editing}
          onAnswered={onAnswered}
        />
      ))}

      {question.questionId === LEGAL_COMMENT_QUESTION_ID && (
        <LegalCommentInputs companyId={companyId} applicantEmail={applicantEmail} comments={comments} files={files} attachSubQuestion={attachSubQuestion} />
      )}

      {showSaveEdit && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="contained"
            startIcon={saveApproval.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            disabled={!editing || !isValid || saveApproval.isPending}
            onClick={save}
          >
            Save
          </Button>
          <Button size="small" variant="outlined" disabled={editing} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Stack>
      )}
    </Box>
  );
}
