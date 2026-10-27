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

import type { Validity } from "@/types";
import { validation } from "@/constants";

const FULL_THREE_LETTER = /^[A-Z]{3}[- ]?\d{4}$/; // AAA1234, AAA-1234, AAA 1234
const FULL_TWO_LETTER = /^[A-Z]{2}[- ]?\d{4}$/; // AB1234, AB-1234, AB 1234
const FULL_SRI = /^\d{1,3}([- ]?)SRI\1\d{4}$/i; // 1 SRI 1234, 1SRI1234, 123-SRI-4567
const FULL_NUMERIC = /^\d{2}[- ]\d{4}$/; // 12 1234, 12-3456
const FULL_E_FORMAT = /^E[- ]?\d{4}$/; // E 1234, E-1234
const FULL_THREE_DIGIT_FORMAT = /^\d{3}[- ]?\d{4}$/; // 251 9572, 251-9572

const PARTIAL_THREE_LETTER = /^[A-Z]{1,3}([- ]?\d{0,4})?$/;
const PARTIAL_TWO_LETTER = /^[A-Z]{0,2}[- ]?\d{0,4}$/;
const PARTIAL_SRI = /^.*S.*$/i;
const PARTIAL_NUMERIC = /^(\d{0,2}[- ]\d{0,4}|\d{0,2})$/;
const PARTIAL_E_FORMAT = /^E([- ]?\d{0,3})?$/;
const PARTIAL_THREE_DIGIT_FORMAT = /^\d{1,3}([- ]?\d{0,4})?$/;

/**
 * Validates a vehicle license plate number against supported formats and returns validation status.
 *
 * Supported formats:
 * - Three letter + 4 digits: AAA1234, AAA-1234, AAA 1234
 * - Two letter + 4 digits: AB1234, AB-1234, AB 1234
 * - SRI format: 1SRI1234, 123-SRI-4567, 1 SRI 1234
 * - Numeric: 12 1234, 12-3456
 * - E format: E1234, E-1234, E 1234
 * - Three digit format: 251-1234, 555 1234, 123-4567
 *
 * @param number - The input string to validate
 * @returns Validity status: VALID (complete format), UNCERTAIN (partial/incomplete), or INVALID
 */
export function validate(number: string): Validity {
  const normalized = number.trim().toUpperCase();

  // Reject strings longer than 7 characters
  if (/^\d+$/.test(normalized) && normalized.length > 7) {
    return validation.INVALID;
  }

  // Reject if ends with 5+ consecutive digits
  if (/\d{5,}$/.test(normalized)) {
    return validation.INVALID;
  }

  // Reject if starts with 4+ digits (except 2-digit + separator)
  if (/^\d{4,}/.test(normalized) && !/^\d{2}[- ]/.test(normalized)) {
    return validation.INVALID;
  }

  if (FULL_SRI.test(normalized)) return validation.VALID;
  if (FULL_THREE_DIGIT_FORMAT.test(normalized)) return validation.VALID;
  if (FULL_E_FORMAT.test(normalized)) return validation.VALID;
  if (FULL_THREE_LETTER.test(normalized)) return validation.VALID;
  if (FULL_TWO_LETTER.test(normalized)) return validation.VALID;
  if (FULL_NUMERIC.test(normalized)) return validation.VALID;

  if (PARTIAL_SRI.test(normalized)) return validation.UNCERTAIN;
  if (PARTIAL_THREE_DIGIT_FORMAT.test(normalized)) return validation.UNCERTAIN;
  if (PARTIAL_E_FORMAT.test(normalized)) return validation.UNCERTAIN;
  if (PARTIAL_THREE_LETTER.test(normalized)) return validation.UNCERTAIN;
  if (PARTIAL_TWO_LETTER.test(normalized)) return validation.UNCERTAIN;
  if (PARTIAL_NUMERIC.test(normalized)) return validation.UNCERTAIN;

  return validation.INVALID;
}

/**
 * Formats a number string to a standardized format with proper spacing.
 *
 * Converts various input formats to consistent output:
 * - "AAA1234" → "AAA 1234"
 * - "123SRI4567" → "123 4567"
 * - "12-1234" → "12 1234"
 * - Handles mixed separators (spaces, hyphens) and case variations
 *
 * @param number - The input string to format
 * @returns Formatted string with standardized spacing, or original if no pattern matches
 */
export function format(number: string): string {
  const normalized = number.trim().toUpperCase().replace(/[- ]+/g, " ");
  const parts = normalized.split(" ");

  // Format various SRI patterns to "123 SRI 1234"
  const sriMatch =
    normalized.match(/^(\d{1,3})\s*SRI\s*(\d{4})$/) ||
    normalized.match(/^(\d{1,3})SRI(\d{4})$/) ||
    normalized.match(/^(\d{1,3})[- ]?SRI[- ]?(\d{4})$/i);

  if (sriMatch) return `${sriMatch[1]} ${sriMatch[2]}`;

  // Format AAA1234 or AA1234 to "AAA 1234"
  if (/^[A-Z]{2,3}\d{4}$/.test(normalized))
    return `${normalized.slice(0, -4)} ${normalized.slice(-4)}`;

  // Already formatted numeric pattern
  if (/^\d{2} \d{4}$/.test(normalized)) return normalized;

  // Already formatted SRI pattern
  if (/^\d{1,3} SRI \d{4}$/.test(normalized)) return normalized;

  // Format "AAA1234" to "AAA 1234"
  const alphaNumMatch = normalized.match(/^([A-Z]{2,3})(\d{4})$/);
  if (alphaNumMatch) return `${alphaNumMatch[1]} ${alphaNumMatch[2]}`;

  // Format already split letter-number pairs
  if (
    parts.length === 2 &&
    /^[A-Z]{1,3}$/.test(parts[0]) &&
    /^\d{4}$/.test(parts[1])
  )
    return `${parts[0]} ${parts[1]}`;

  // Return as-is if no pattern matches
  return normalized;
}
