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

import { Accordion, AccordionDetails, AccordionSummary, Alert, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { useCreditScoreItems } from "../api/useCreditScore";
import CreditScoreChecking from "./CreditScoreChecking";
import WorkingsForRatios from "./WorkingsForRatios";

// Ported from the source app's Resellers/ResellerDashboard/CreditScore/CreditScore.js
// — fetches the raw financials + ratio scales once and composes the
// editable input table with the read-only computed-ratio display.
export default function CreditScore({ companyId }: { companyId: string }) {
  const creditScore = useCreditScoreItems(companyId);

  if (creditScore.isLoading) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading credit score…
        </Typography>
      </Stack>
    );
  }
  if (creditScore.isError) {
    return <Alert severity="error">Couldn't load credit score data. {humanizeHttpError(creditScore.error)}</Alert>;
  }

  const items = creditScore.data?.items ?? [];
  const ratios = creditScore.data?.ratios ?? [];
  const currency = creditScore.data?.currency[0]?.descriptionAnswer ?? "";
  const year1 = items.find((i) => i.year === 1);
  const year2 = items.find((i) => i.year === 2);
  const year3 = items.find((i) => i.year === 3);
  const savedYears = year1 && year2 && year3 ? { 1: year1, 2: year2, 3: year3 } : undefined;

  return (
    <Stack spacing={2}>
      {savedYears && ratios.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
            <Typography sx={{ fontWeight: 700 }}>Credit Score Checking</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <CreditScoreChecking year1={savedYears[1]} year2={savedYears[2]} year3={savedYears[3]} ratios={ratios} currency={currency} />
          </AccordionDetails>
        </Accordion>
      )}
      {ratios.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
            <Typography sx={{ fontWeight: 700 }}>Workings for Ratios</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <WorkingsForRatios companyId={companyId} currency={currency} savedYears={savedYears} />
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}
