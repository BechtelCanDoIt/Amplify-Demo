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
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { useLegalAnswers, useLegalQuestions } from "../api/useLegal";
import LegalQuestionDetails from "./LegalQuestionDetails";

// The three fixed sections the source app renders, each pinned to one
// category id — ported from Resellers/ResellerDashboard/Legal/Legal.js,
// which hardcodes these exact category ids and disabled flags rather than
// deriving them from a category list.
const SECTIONS = [
  { sortIndex: 1, title: "Legal Documents", categoryId: 4, disabled: true, showComments: false },
  { sortIndex: 2, title: "Legal Information", categoryId: 2, disabled: true, showComments: true },
  { sortIndex: 3, title: "Legal Opinion", categoryId: 9, disabled: false, showComments: true },
] as const;

export default function LegalTab({ companyId, applicantEmail }: { companyId: string; applicantEmail: string }) {
  const questions = useLegalQuestions(companyId);
  const answers = useLegalAnswers(companyId);
  const [closedSections, setClosedSections] = useState<Set<number>>(new Set());

  const toggleSection = (sortIndex: number) => {
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sortIndex)) next.delete(sortIndex);
      else next.add(sortIndex);
      return next;
    });
  };

  if (questions.isLoading || answers.isLoading) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", p: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading legal questionnaire…
        </Typography>
      </Stack>
    );
  }
  if (questions.isError || answers.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Couldn't load the legal questionnaire. {humanizeHttpError(questions.error ?? answers.error)}</Alert>
      </Box>
    );
  }

  const allQuestions = questions.data?.questions ?? [];
  const subQuestions = questions.data?.subQuestions ?? [];

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {SECTIONS.map((section) => (
          <Accordion key={section.sortIndex} expanded={!closedSections.has(section.sortIndex)} onChange={() => toggleSection(section.sortIndex)}>
            <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
              <Typography sx={{ fontWeight: 700 }}>
                {section.sortIndex}. {section.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {allQuestions
                .filter((q) => q.categoryId === section.categoryId)
                .map((question) => (
                  <LegalQuestionDetails
                    key={question.questionId}
                    companyId={companyId}
                    applicantEmail={applicantEmail}
                    categoryId={String(section.sortIndex) as "1" | "2" | "3"}
                    categoryDisabled={section.disabled}
                    question={question}
                    subQuestions={subQuestions}
                    answers={answers.data?.answers ?? []}
                    files={answers.data?.files ?? []}
                    comments={section.showComments ? (answers.data?.comments ?? []) : []}
                    onFormChanged={() => void answers.refetch()}
                  />
                ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  );
}
