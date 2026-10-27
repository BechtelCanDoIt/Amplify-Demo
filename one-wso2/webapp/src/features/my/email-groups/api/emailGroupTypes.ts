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

// Wire shapes are just `string[]` of group email addresses (mirroring the
// email-group-manager backend's own responses) — see @config/apiConfig's
// emailGroupsServiceUrls. Everything below is the domain model the UI
// actually renders, built from those three arrays by groupCatalog.ts.
//
// "Public" / "private" match the source app's own vocabulary (its
// `publicGroups` variable, its `PrivateGroupsList` component) rather than the
// backend's endpoint names (`all-google-groups`) — see GroupCatalog below.

/** One row in the public directory, with the caller's own state folded in. */
export interface PublicGroup {
  name: string;
  isSubscribed: boolean;
}

/**
 * The three lists the page renders, derived once from the three raw
 * responses. See groupCatalog.ts for how.
 */
export interface GroupCatalog {
  /** Everyone's in these; there is no endpoint to leave one. */
  defaultGroups: string[];
  /** The public, subscribe/unsubscribe-able directory, each with its state. */
  publicGroups: PublicGroup[];
  /**
   * Groups the caller is subscribed to that are neither a default group nor
   * in the public directory — most often because an admin added them
   * directly outside self-service. Read-only: there is no way to join or
   * leave one from here.
   */
  privateGroups: string[];
}

/** `PATCH /google-group/{subscribe,unsubscribe}` body. */
export interface GroupSubscriptionPayload {
  groupName: string;
  userEmail: string;
}

/** What a confirmation dialog is about to do, and to which groups. */
export type GroupAction = "subscribe" | "unsubscribe";

/**
 * The "My Groups" section shows only what the caller is already subscribed
 * to, split by where each group came from — this picks which of those three
 * origins are included. "All" is every origin at once.
 */
export type GroupCategoryFilter = "all" | "default" | "private" | "public";

/** Which of the three origins a "My Groups" row came from. */
export type GroupCategory = "default" | "private" | "public";

/**
 * One row of "My Groups" — always something the caller is subscribed to,
 * tagged with which list it came from. Only a `category: "public"` row is
 * ever actionable (Unsubscribe); default and private rows are read-only.
 */
export interface MyGroupRow {
  name: string;
  category: GroupCategory;
}
