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

// Wire types for the digiops-hr subscription-app backend, mirroring its
// Ballerina records one-for-one (backend/types.bal, modules/database/types.bal,
// modules/entity/types.bal). Named after the records rather than after our
// screens, so a drift between the two is visible at the boundary rather than
// hidden behind a friendlier local name.

/** One row of the commute price table: a distance band and its monthly rate. */
export interface CommuteDistanceRange {
  id: number;
  minKm: number;
  maxKm: number;
  /** LKR per month. An integer — the backend has no sub-rupee rates. */
  monthlyRate: number;
}

/**
 * GET /subscriptions/meta-info.
 *
 * Everything the screens need that isn't per-employee: the price table, the
 * four day boundaries of the two monthly windows, and — the part that makes
 * this call load-bearing rather than cosmetic — the NAMES of the two Asgardeo
 * admin groups. They're configurable per deployment on the service side, so
 * they can't be constants here; see useSubscriptionGate.
 */
export interface SubscriptionsMetaInfo {
  distances: CommuteDistanceRange[];
  /** Day-of-month the opt-in window opens (inclusive). */
  optInStartDay: number;
  /** Day-of-month it closes (inclusive). May be LOWER than the start — the
   *  window wraps into the next month. Every consumer must handle that. */
  optInEndDay: number;
  optOutStartDay: number;
  optOutEndDay: number;
  /** LKR per month for LaaS. */
  laasCost: number;
  /** Groups that use the services free of charge (interns, today). */
  excludedGroups: string[];
  /** What to show a member of one of those groups instead of a price. */
  serviceChargeMsg: string;
  /** Asgardeo group allowed to manage COMMUTE subscriptions for others. */
  commuteAdminGroup: string;
  /** Asgardeo group allowed to manage MEAL subscriptions for others. */
  lunchAdminGroup: string;
}

/**
 * GET /commutes/{email}.
 *
 * `isSubscribed` is what decides the state — a row exists for anyone who has
 * EVER subscribed, so presence of the record means nothing on its own. The
 * endpoint 404s when there is no row at all; useCommuteSubscription folds that
 * into `null` rather than an error, because "never subscribed" is a normal
 * state and not a failure.
 */
export interface CommuteSubscription {
  id: number;
  employeeEmail: string;
  contactNumber?: string;
  isSubscribed: boolean;
  distanceRangeId: number;
  createdBy: string;
  updatedBy: string;
  createdOn: string;
  updatedOn: string;
  /** Pre-formatted "5-10" band, present on some responses. Not relied on —
   *  the screens resolve the band from `distanceRangeId` against the price
   *  table, which is always available. */
  distanceRange?: string;
  monthlyRate?: string;
}

/** GET /meal/{email}. Same 404-means-never-subscribed contract as above. */
export interface MealSubscription {
  id: number;
  employeeEmail: string;
  isSubscribed: boolean;
  createdBy: string;
  updatedBy: string;
  createdOn: string;
  updatedOn: string;
}

/** POST /commutes/{email}/subscribe. */
export interface CommuteSubscribePayload {
  distanceRangeId: number;
  /** Sri Lankan mobile, +947XXXXXXXX. The backend re-validates the same
   *  pattern and rejects the request outright, so the client check is a
   *  courtesy, not the rule — see util/contactNumber. */
  contactNumber: string;
}

/** One row of GET /employees — the admin picker's roster. */
export interface SubscriptionEmployee {
  workEmail: string;
  firstName: string;
  lastName: string;
  employeeThumbnail: string | null;
}

/**
 * The two services, as one shape.
 *
 * Both screens treat them as a pair — the self-service page renders a card per
 * service, the admin page a panel per service — and the only real differences
 * are the endpoints, the admin group, and whether the service carries the
 * distance/contact fields. Keeping that in one descriptor is what lets both
 * pages loop instead of duplicating a block of near-identical JSX per service.
 */
export type ServiceKey = "commute" | "meal";

export interface ServiceDef {
  key: ServiceKey;
  /** The name users know it by, and the one the emails use. */
  title: string;
  /** Whether the service needs a distance band and a contact number. */
  hasCommuteFields: boolean;
}

export const SERVICES: readonly ServiceDef[] = [
  { key: "commute", title: "PickMe Commute", hasCommuteFields: true },
  { key: "meal", title: "LaaS", hasCommuteFields: false },
];

/** A distance band as the picker shows it: "5 - 10 km", "LKR 4,350". */
export interface DistanceOption {
  value: number;
  label: string;
  cost: string;
}

export function distanceOptionsFrom(
  distances: readonly CommuteDistanceRange[] | undefined,
): DistanceOption[] {
  return (distances ?? []).map((d) => ({
    value: d.id,
    label: `${d.minKm} - ${d.maxKm} km`,
    cost: `LKR ${d.monthlyRate.toLocaleString()}`,
  }));
}
