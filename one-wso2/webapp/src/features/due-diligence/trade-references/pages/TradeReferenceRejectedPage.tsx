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

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import { useParams } from "react-router";
import DueDiligenceShell from "@features/due-diligence/components/DueDiligenceShell";
import { DUE_DILIGENCE_EYEBROW } from "@constants/dueDiligenceApps";
import { humanizeHttpError } from "@api/http";
import { usePartnerInfo } from "@features/due-diligence/partners/api/usePartners";
import { useTradeReferenceDetail, useTradeReferenceQuestions } from "../api/useTradeReferences";
import TradeReferenceQuestionDetails from "../components/TradeReferenceQuestionDetails";
import { useDueDiligenceNavigate } from "@features/due-diligence/api/useDueDiligenceNavigate";

// The reject page shows only the reject-reason question and its neighbors
// (37 "reason for rejection", 38 "additional comments"), plus 39 — a direct
// port of RejectedPage.js's `[74, 37, 38, 39].includes(question.questionId)` filter.
const REJECTED_PAGE_QUESTION_IDS = new Set([74, 37, 38, 39]);

// Ported from the source app's TradeReferences/TradeReferenceDashboard/RejectedPage.js.
export default function TradeReferenceRejectedPage() {
  const { companyId, linkId } = useParams<{ companyId: string; linkId: string }>();
  const navigate = useDueDiligenceNavigate();
  const partnerInfo = usePartnerInfo(companyId ?? "");
  const detail = useTradeReferenceDetail(companyId ?? "", linkId ?? "");
  const questionData = useTradeReferenceQuestions();

  const reseller = partnerInfo.data?.[0];
  const questions = questionData.data?.questions ?? [];
  const subQuestions = questionData.data?.subQuestions ?? [];
  const answers = detail.data?.data ?? [];

  return (
    <DueDiligenceShell
      back={{ onClick: () => navigate("/due-diligence/trade-references") }}
      eyebrow={DUE_DILIGENCE_EYEBROW}
      title="Trade reference — rejected"
    >
      <Chip variant="outlined" color="error" label="Form Status: Rejected" size="small" sx={{ mb: 3 }} />

      {partnerInfo.isLoading || detail.isLoading || questionData.isLoading ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        </Stack>
      ) : partnerInfo.isError || detail.isError || questionData.isError ? (
        <Alert severity="error">
          Couldn't load this trade reference. {humanizeHttpError(partnerInfo.error ?? detail.error ?? questionData.error)}
        </Alert>
      ) : (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
            <Typography sx={{ fontWeight: 700 }}>Trade Reference Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Regarding
            </Typography>
            <Box sx={{ display: "grid", gap: 2 }}>
              <TextField label="Reference Company Name" value={reseller?.companyName ?? ""} disabled fullWidth size="small" />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
                <TextField label="Country" value={reseller?.country ?? ""} disabled fullWidth size="small" />
                {reseller?.state && (
                  <TextField label="State" value={reseller.state} disabled fullWidth size="small" />
                )}
                <TextField label="City/Province" value={reseller?.cityProvince ?? ""} disabled fullWidth size="small" />
                <TextField label="Street Address" value={reseller?.streetAddress ?? ""} disabled fullWidth size="small" />
              </Box>
              {questions
                .filter((q) => REJECTED_PAGE_QUESTION_IDS.has(q.questionId))
                .map((question) => (
                  <TradeReferenceQuestionDetails key={question.questionId} question={question} subQuestions={subQuestions} answers={answers} />
                ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </DueDiligenceShell>
  );
}
