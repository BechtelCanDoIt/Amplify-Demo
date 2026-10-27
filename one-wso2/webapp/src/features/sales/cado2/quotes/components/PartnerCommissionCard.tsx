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

import type { JSX } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { InputAdornment, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { HandshakeIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { commissionProblem, type DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";
import { useFieldIssue } from "@features/sales/cado2/quotes/components/fieldIssues";
import { formatMoney } from "@features/sales/cado2/utils/money";

/**
 * The partner's commission on a partner-led quote: one % for every line,
 * as Salesforce records it on each opportunity line. The partner keeps it;
 * WSO2 invoices the rest (A6).
 */
export default function PartnerCommissionCard({
  commission,
  total,
  currency,
}: {
  /** The worked-out commission and the total it is taken from, once priced. */
  commission: string | null;
  total: string | null;
  currency: string;
}): JSX.Element {
  const { control } = useFormContext<DraftFormValues>();
  const issue = useFieldIssue("partnerCommissionPercent");
  return (
    <SectionCard title="Partner Commission" icon={<HandshakeIcon size={18} />}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Controller
          name="partnerCommissionPercent"
          control={control}
          render={({ field }) => {
            const problem = field.value.trim() ? commissionProblem(field.value) : "";
            return (
              <TextField
                {...field}
                label="Commission"
                size="small"
                required
                inputMode="decimal"
                sx={{ maxWidth: 180 }}
                error={Boolean(problem || issue)}
                helperText={problem || issue || "0 if none"}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              />
            );
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {commission && total
            ? `= ${currency} ${formatMoney(commission)} of ${formatMoney(total)}. The partner keeps this share of every line; WSO2 invoices the rest.`
            : "The partner keeps this share of every line; WSO2 invoices the rest."}
        </Typography>
      </Stack>
    </SectionCard>
  );
}
