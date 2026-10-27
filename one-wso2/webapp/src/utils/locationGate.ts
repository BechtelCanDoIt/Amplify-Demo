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

// Both subscription services (PickMe Commute, LaaS) are Colombo-office
// perks — see the note on CONTACT_NUMBER_PATTERN — so the Subscriptions
// section of the rail is only worth showing to a Sri Lanka-based employee.
//
// `workLocation` comes from people-app's own free-text `work_location`
// column (see people-app's onboarding form, "Work Location") rather than a
// fixed enum, so it is compared case- and whitespace-insensitively instead
// of with `===`. This is presentation only, same as the Asgardeo-group gate
// in useSubscriptionGate: it decides whether the section is worth showing,
// not whether the subscription backend will accept the request — every
// subscribe/unsubscribe call still goes through the same authorization the
// backend already enforces regardless of what this returns.
const SRI_LANKA = "sri lanka";

/**
 * Whether `workLocation` is Sri Lanka. `null`/`undefined` — a location the
 * caller's /user-info doesn't carry, or hasn't resolved yet — reads as "no",
 * not "unknown assumed yes": failing closed here just hides a nav item, while
 * failing open would offer a Colombo-only perk to someone outside it.
 */
export function isSriLankaWorkLocation(workLocation: string | null | undefined): boolean {
  return (workLocation ?? "").trim().toLowerCase() === SRI_LANKA;
}
