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

// The contact number a commute subscription carries — the number the PickMe
// driver calls.
//
// The pattern is the backend's, character for character: `CommuteSubscribe`
// constrains `contactNumber` to `^\+947[0-9]{8}$` and rejects anything else
// with a 400. It is duplicated here ONLY to say so before the round trip; the
// service remains the authority, and this must be kept in step with it rather
// than loosened locally when someone's number doesn't fit.
//
// Sri Lankan mobiles only, by design: the services are for the Colombo office.
export const CONTACT_NUMBER_PATTERN = /^\+947[0-9]{8}$/;

/** What to show under the field — the shape, not a scolding. */
export const CONTACT_NUMBER_HINT = "Sri Lankan mobile, e.g. +94771234567";

export function isValidContactNumber(value: string): boolean {
  return CONTACT_NUMBER_PATTERN.test(value.trim());
}

/**
 * The value to SEND, which is the trimmed one.
 *
 * A trailing space is the single most common way a pasted number fails the
 * backend's constraint, and trimming at the boundary rather than on every
 * keystroke lets someone paste and keep typing without the field fighting
 * them.
 */
export function normalizeContactNumber(value: string): string {
  return value.trim();
}

/**
 * The value to SHOW: `+94 71 345 6789` rather than the wire form's
 * `+94713456789`. Display only — never feed this back into the input or the
 * subscribe payload, both of which want the plain digits the pattern above
 * validates.
 *
 * The grouping (2-3-4 after the `+94`) is how a Sri Lankan mobile number is
 * conventionally written, not an arbitrary chunking.
 *
 * Falls back to the raw value, unformatted, for anything that doesn't match
 * the expected shape — an already-subscribed row predates this formatter and
 * its number is still exactly nine digits after +94, but a defensive fallback
 * costs nothing and means a future format change on the backend degrades to
 * "unformatted" instead of to a mis-sliced string.
 */
export function formatContactNumberForDisplay(value: string): string {
  if (!CONTACT_NUMBER_PATTERN.test(value)) return value;
  const local = value.slice(3); // digits after "+94", always 9 of them here
  return `+94 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}
