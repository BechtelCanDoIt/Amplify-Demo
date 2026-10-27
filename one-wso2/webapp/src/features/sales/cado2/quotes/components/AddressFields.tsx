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
import { Box, TextField } from "@wso2/oxygen-ui";
import type { AddressValue, DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";
import { useFieldIssue } from "./fieldIssues";

interface AddressFieldsProps {
  readonly name: "billTo" | "shipTo";
  readonly disabled?: boolean;
}

const FIELDS: readonly {
  key: keyof AddressValue;
  label: string;
  wide?: boolean;
  required?: boolean;
}[] = [
  { key: "companyName", label: "Company name", wide: true, required: true },
  { key: "addressLine1", label: "Address line 1", wide: true, required: true },
  { key: "addressLine2", label: "Address line 2", wide: true },
  { key: "city", label: "City", required: true },
  { key: "stateProvince", label: "State / province" },
  { key: "postalCode", label: "Postal code" },
  { key: "country", label: "Country", required: true },
  { key: "taxId", label: "Tax ID" },
];

function AddressField({
  name,
  field,
  disabled,
}: {
  name: "billTo" | "shipTo";
  field: (typeof FIELDS)[number];
  disabled?: boolean;
}) {
  const { control } = useFormContext<DraftFormValues>();
  const issue = useFieldIssue(`${name}.${field.key}`);
  return (
    <Box sx={{ gridColumn: field.wide ? "1 / -1" : undefined }}>
      <Controller
        name={`${name}.${field.key}`}
        control={control}
        render={({ field: input }) => (
          <TextField
            {...input}
            label={field.label}
            required={field.required}
            disabled={disabled}
            error={Boolean(issue)}
            helperText={issue}
            size="small"
            fullWidth
          />
        )}
      />
    </Box>
  );
}

/**
 * An editable address, pre-filled from Salesforce where possible. Salesforce
 * holds no tax ID field, so the tax ID is always typed in.
 */
export default function AddressFields({ name, disabled }: AddressFieldsProps): JSX.Element {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 1.5,
      }}
    >
      {FIELDS.map((f) => (
        <AddressField key={f.key} name={name} field={f} disabled={disabled} />
      ))}
    </Box>
  );
}
