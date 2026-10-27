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

import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import type {
  CommuteSubscription,
  DistanceOption,
  MealSubscription,
  ServiceDef,
} from "../api/subscriptionTypes";
import { formatContactNumberForDisplay } from "../util/contactNumber";

// What an active subscription costs and covers, once there is nothing left to
// choose.
//
// The commute fields become READ-ONLY the moment someone is subscribed,
// because the service has no endpoint that changes a band or a number in
// place — the only way to move bands is to opt out and opt back in, across two
// separate windows. Leaving the inputs editable would offer an edit the
// backend cannot perform.
//
// The band and rate are resolved from the price table against
// `distanceRangeId`, not read from the response's own `distanceRange` /
// `monthlyRate` strings. Those two fields are optional on the record and
// absent on several paths; the price table is always loaded by the time a card
// renders, so one source is used for both the picker and this summary and they
// cannot disagree.

export default function SubscriptionSummary({
  service,
  record,
  distanceOptions,
  laasCost,
  isInExcludedGroup,
  serviceChargeMsg,
}: {
  service: ServiceDef;
  record: CommuteSubscription | MealSubscription | null;
  distanceOptions: DistanceOption[];
  laasCost: number;
  isInExcludedGroup: boolean;
  serviceChargeMsg: string;
}) {
  if (service.hasCommuteFields) {
    const commute = record as CommuteSubscription | null;
    const band = distanceOptions.find((o) => o.value === commute?.distanceRangeId);
    return (
      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
        <Row label="Distance" value={band?.label ?? "—"} />
        <Row
          label="Monthly rate"
          value={isInExcludedGroup ? serviceChargeMsg : (band?.cost ?? "—")}
        />
        <Row
          label="Contact number"
          value={
            commute?.contactNumber
              ? formatContactNumberForDisplay(commute.contactNumber)
              : "—"
          }
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
      <Row
        label="Monthly rate"
        value={
          isInExcludedGroup ? serviceChargeMsg : `LKR ${laasCost.toLocaleString()}`
        }
      />
    </Stack>
  );
}

/**
 * The price line for a service nobody is subscribed to yet.
 *
 * Same numbers as the summary above, shown BEFORE the decision rather than
 * after it — which is when the price actually matters. Commute has no single
 * price to name (it depends on the band), so this is LaaS-only; the commute
 * picker carries a price per option instead.
 */
export function PriceLine({
  laasCost,
  isInExcludedGroup,
  serviceChargeMsg,
}: {
  laasCost: number;
  isInExcludedGroup: boolean;
  serviceChargeMsg: string;
}) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
      {isInExcludedGroup ? serviceChargeMsg : `LKR ${laasCost.toLocaleString()} per month`}
    </Typography>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right" }}>
        {value}
      </Typography>
    </Box>
  );
}
