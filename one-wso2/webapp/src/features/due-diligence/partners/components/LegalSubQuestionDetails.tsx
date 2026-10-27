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
import { Box, FormControl, FormControlLabel, Radio, RadioGroup, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { FileIcon } from "@wso2/oxygen-ui-icons-react";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import { LEGAL_CHOOSE_FILE_SUBQUESTION_ID } from "@features/due-diligence/constants";
import type { LegalAnswer, LegalFileSubmission, LegalQuestion, LegalSubQuestion } from "../api/legalTypes";

/**
 * Ported from the source app's Resellers/ResellerDashboard/Legal/SubQuestionDetails.js.
 *
 * Editing here is gated on `legalApprover` alone (not the parent's
 * fieldDisabled/Edit-button flow the way Finance's is) — a non-approver
 * always sees these fields disabled, matching the source's
 * `checkIfRoleExists(roles.legalApprover) ? disabled||fieldDisabled : true`.
 * The file-upload sub-question (id 104, "choose file") is deliberately
 * excluded here — its files render inside the question 80 comment thread
 * instead (see LegalCommentInputs), same as the source.
 */
export default function LegalSubQuestionDetails({
  categoryId,
  question,
  subQuestion,
  answer,
  files,
  fieldDisabled,
  onAnswered,
}: {
  categoryId: "1" | "2" | "3";
  question: LegalQuestion;
  subQuestion: LegalSubQuestion;
  answer?: LegalAnswer;
  files: LegalFileSubmission[];
  fieldDisabled: boolean;
  onAnswered: (subQuestionId: number, booleanAnswer: boolean | "", descriptionAnswer: string, isValid: boolean) => void;
}) {
  const gate = useDueDiligenceGate();
  // Local, not derived from `answer`: the prop only ever reflects the last
  // SAVED value, so without this the radio would silently ignore every click
  // until Save round-tripped and refetched — the draft was still recorded
  // correctly (onAnswered still fires), it just never painted. Tri-state
  // (not a plain boolean) because "" (unanswered) and "no" both need to be
  // distinguishable — a boolean can't represent "the user just picked No on
  // a question with no saved answer yet" separately from "still unanswered".
  // The lazy initializer is safe because the parent keys this component by a
  // stable id (the sub-question id), so a genuinely different question
  // remounts rather than reusing this state.
  const [radioValue, setRadioValue] = useState<"yes" | "no" | "">(
    answer === undefined ? "" : answer.booleanAnswer ? "yes" : "no",
  );

  if (question.questionId !== subQuestion.questionId) return null;

  const editable = gate.hasRole("legalApprover") ? !fieldDisabled : false;

  const handleRadioChange = (value: string) => {
    const boolValue = value === "yes";
    setRadioValue(boolValue ? "yes" : "no");
    onAnswered(subQuestion.subQuestionId, boolValue, "", true);
  };

  const openFile = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    const path = extension === "pdf" ? "/due-diligence/view-pdf" : ["jpg", "jpeg", "png"].includes(extension) ? "/due-diligence/view-image" : null;
    // `from=legal` — see the identical note in FinanceSubQuestionDetails.tsx;
    // a new tab has no history entry to carry `fromPerspective` on, so the
    // URL itself has to say which perspective opened it.
    if (path)
      window.open(
        `${path}?fileName=${encodeURIComponent(fileName)}&extension=${encodeURIComponent(extension)}&from=legal`,
        "_blank",
        "noopener,noreferrer",
      );
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      {subQuestion.answerType && (
        <FormControl disabled={!editable}>
          <RadioGroup row value={radioValue} onChange={(e) => handleRadioChange(e.target.value)}>
            <FormControlLabel value="yes" control={<Radio size="small" />} label={categoryId === "3" ? "Approve" : "Yes"} />
            <FormControlLabel value="no" control={<Radio size="small" />} label={categoryId === "3" ? "Reject" : "No"} />
          </RadioGroup>
        </FormControl>
      )}

      {subQuestion.answerDescription && subQuestion.answerType && radioValue === "yes" && (
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          label={subQuestion.description}
          defaultValue={answer?.descriptionAnswer ?? ""}
          onChange={(e) => onAnswered(subQuestion.subQuestionId, "", e.target.value, true)}
          disabled={!editable}
          sx={{ mt: 1 }}
        />
      )}

      {subQuestion.answerDescription && !subQuestion.answerType && (
        <TextField
          size="small"
          fullWidth
          multiline={categoryId === "3"}
          minRows={categoryId === "3" ? 3 : 1}
          label={subQuestion.description}
          defaultValue={answer?.descriptionAnswer ?? ""}
          onChange={(e) => onAnswered(subQuestion.subQuestionId, "", e.target.value, true)}
          disabled={!editable}
          sx={{ mt: 1 }}
        />
      )}

      {subQuestion.answerFileUpload && subQuestion.subQuestionId !== LEGAL_CHOOSE_FILE_SUBQUESTION_ID && (
        <Box sx={{ mt: 1 }}>
          {subQuestion.description && <Typography variant="body2" sx={{ mb: 1 }}>{subQuestion.description}</Typography>}
          <Stack spacing={1}>
            {files
              .filter((f) => f.subQuestionId === subQuestion.subQuestionId)
              .map((f) => (
                <Stack key={f.fileId} direction="row" spacing={1} sx={{ alignItems: "center", bgcolor: "background.default", border: 1, borderColor: "divider", borderRadius: 1, p: 1, cursor: "pointer" }} onClick={() => openFile(f.fileName)}>
                  <FileIcon size={16} />
                  <Typography variant="body2">{f.fileName}</Typography>
                </Stack>
              ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
