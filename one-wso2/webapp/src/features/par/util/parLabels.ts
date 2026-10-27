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

// Mirrors par-app's EmployeeChip.tsx exactly — the one place both the PAR
// rating chip and the special (top 5%/20%) rating chip map a raw wire value
// to display text + color. Both chips in EmployeePar.tsx go through this
// same switch (it doesn't care which field the text came from), so this is
// one function for both rather than a special-rating-only mapper.
//
// Left out of the PDF export on purpose — EmployeePar.tsx's downloadPDF only
// substitutes "Not Assigned" for the NOT_ASSIGNED placeholder there; a real
// TOP5P/TOP20P/etc. value is written to the PDF text raw, unmapped. Mapping
// it in the PDF too would be an improvement over the source, not a match.
export type ChipColor = "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";

export function employeeChipLabel(text: string): { label: string; color: ChipColor } {
  // ParAdminGlobalConfigTab.tsx's rating fields are a freeSolo Autocomplete —
  // admins type the rating tiers themselves, so "Below Expectations" could
  // just as easily be entered as "below expectations" or with stray
  // whitespace. Matching case/whitespace-insensitively means a real tier
  // still gets its color even when it doesn't match this list byte-for-byte.
  // `label` keeps the admin's own casing but not the stray whitespace —
  // trimmed once here so every case (and the untouched default) agrees.
  const trimmed = text.trim();
  switch (trimmed.toLowerCase()) {
    case "top5p":
      return { label: "Top 5%", color: "warning" };
    case "top20p":
      return { label: "Top 20%", color: "warning" };
    case "successful":
      return { label: trimmed, color: "success" };
    case "needs improvements":
      return { label: "Need Improvements", color: "error" };
    case "below expectations":
      return { label: trimmed, color: "error" };
    case "not_assigned":
      return { label: "Not Assigned", color: "default" };
    case "exceptional":
      return { label: trimmed, color: "primary" };
    default:
      return { label: trimmed, color: "default" };
  }
}

/** The PDF's own (narrower) substitution: only the NOT_ASSIGNED placeholder
 * becomes "Not Assigned" text; anything else is written raw, exactly as
 * EmployeePar.tsx's downloadPDF does. */
export function pdfRatingText(value: string | undefined, fallback = "Not Assigned"): string {
  if (!value || value === "NOT_ASSIGNED") return fallback;
  return value;
}
