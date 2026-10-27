// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import { config } from "../config";

// Letter types supported by the official PO Team request form.
// Verified against the live form on 2026-06-15. Keep in sync with the form fields
// if HR adds or removes a letter type — otherwise the model may miss-list options.
export const LETTER_TYPES: readonly string[] = [
  "Employee confirmation",
  "Visa letter (mentions leave details)",
  "Passport renewal",
  "Service letter",
  "Salary undertaking letter (for banks)",
  "Employment & salary confirmation",
  "PFCA account opening",
  "Employment and USD consultancy confirmation",
  "Internship letter",
  "Employment confirmation and name mismatch in EPF/ETF records",
];

// Read-only — returns the configured form URL + supported letter types.
// No backend call; the tool exists so we can audit-log each request and so the
// model has a single deterministic source of truth instead of guessing.
export async function getLetterRequestForm(): Promise<{
  success: true;
  formUrl: string;
  letterTypes: readonly string[];
  message: string;
}> {
  return {
    success: true,
    formUrl: config.letterRequestFormUrl,
    letterTypes: LETTER_TYPES,
    message: "Submit this form to request any of the listed letter types from the PO team.",
  };
}
