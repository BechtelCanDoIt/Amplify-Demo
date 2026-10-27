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
import { MenuItem, TextField } from "@wso2/oxygen-ui";
import { CalendarClockIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import type { DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";

/** How many days the customer has to pay each invoice (D86: its own card on Commercials, every quote). */
export default function PaymentTermsCard(): JSX.Element {
  const { control } = useFormContext<DraftFormValues>();
  return (
    <SectionCard title="Payment Terms" icon={<CalendarClockIcon size={18} />}>
      <Controller
        name="netTermsDays"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label="Payment terms"
            size="small"
            sx={{ minWidth: 200 }}
            required
            helperText="Days the customer has to pay each invoice"
          >
            <MenuItem value="30">30 days</MenuItem>
            <MenuItem value="45">45 days</MenuItem>
            <MenuItem value="60">60 days</MenuItem>
          </TextField>
        )}
      />
    </SectionCard>
  );
}
