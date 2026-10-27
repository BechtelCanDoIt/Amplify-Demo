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

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { BusFrontIcon, UtensilsIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { describeError } from "@api/errors";
import {
  distanceOptionsFrom,
  type ServiceDef,
  type SubscriptionEmployee,
  type SubscriptionsMetaInfo,
} from "../api/subscriptionTypes";
import { useServiceSubscription } from "../api/useServiceSubscription";
import type { SubscriptionGate } from "../api/useSubscriptionGate";
import { normalizeContactNumber } from "../util/contactNumber";
import CommuteFields, {
  commuteFieldsValid,
  type CommuteFieldsState,
} from "./CommuteFields";
import ConfirmSubscriptionDialog from "./ConfirmSubscriptionDialog";
import SubscriptionSummary, { PriceLine } from "./SubscriptionSummary";
import { fullName } from "./SubscriptionEmployeePicker";

// One service, for the employee an admin has selected.
//
// Deliberately NOT ServiceCard with a flag. The two screens differ in the one
// rule that matters: this panel has no date window, because the service lets
// an admin act outside both ("Admins acting on behalf of another employee
// bypass the opt-in date window; self-service still enforces it"). Threading a
// `bypassWindow` boolean through ServiceCard would put that exemption inside
// the component that exists to enforce it, where the next reader has to work
// out which half applies to them.
//
// What the two DO share is factored out — the fields, the summary, the
// confirmation, and the per-service hook underneath. So the duplication here
// is the two paragraphs of layout, not the rules.

const ICONS = {
  commute: BusFrontIcon,
  meal: UtensilsIcon,
} as const;

export default function AdminServicePanel({
  service,
  meta,
  gate,
  employee,
}: {
  service: ServiceDef;
  meta: SubscriptionsMetaInfo;
  gate: SubscriptionGate;
  employee: SubscriptionEmployee;
}) {
  const state = useServiceSubscription(service, employee.workEmail);
  const { showSuccess, showError } = useNotifications();

  const distanceOptions = distanceOptionsFrom(meta.distances);
  // Selecting a different person must not carry the last one's half-typed
  // number into their subscription. The page remounts this panel per employee
  // (see its `key`), so all three pieces of state below are discarded on the
  // switch — which is what a key is for, and cheaper to read than an effect
  // that resets each of them by hand.
  const [fields, setFields] = useState<CommuteFieldsState>({
    distanceRangeId: "",
    contactNumber: "",
  });
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const Icon = ICONS[service.key];
  const optingIn = !state.isSubscribed;
  const person = fullName(employee) || employee.workEmail;
  const fieldsReady = !optingIn || !service.hasCommuteFields || commuteFieldsValid(fields);

  const openConfirm = () => {
    // Only opting IN has anything to validate — unsubscribing sends no
    // payload, so there's nothing for CommuteFields to flag. Setting this
    // unconditionally used to mark the (already-empty) fields invalid on
    // every Unsubscribe click too, and since nothing else clears it, that
    // stale `true` was still in effect on the very next render — the moment
    // this same employee flips to "not subscribed" and CommuteFields mounts
    // for the empty opt-in form, it opened already showing red errors on a
    // form nobody had touched yet.
    if (optingIn) setShowErrors(true);
    if (!fieldsReady) return;
    setConfirming(true);
  };

  const submit = async () => {
    try {
      if (optingIn) {
        await state.subscribe(
          service.hasCommuteFields
            ? {
                distanceRangeId: Number(fields.distanceRangeId),
                contactNumber: normalizeContactNumber(fields.contactNumber),
              }
            : undefined,
        );
        // Names the person, because an admin doing this ten times in a row has
        // no other way to tell which one the banner is about.
        showSuccess(`Subscribed ${person} to ${service.title}.`);
        setFields({ distanceRangeId: "", contactNumber: "" });
        setShowErrors(false);
      } else {
        await state.unsubscribe();
        showSuccess(`Unsubscribed ${person} from ${service.title}.`);
      }
      setConfirming(false);
    } catch (error) {
      showError(describeError(error));
    }
  };

  return (
    <Card variant="outlined" sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1,
            bgcolor: "action.hover",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </Box>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          {service.title}
        </Typography>
        {state.isLoading ? (
          <Skeleton variant="rounded" width={92} height={24} />
        ) : (
          <Chip
            size="small"
            label={state.isSubscribed ? "Subscribed" : "Not subscribed"}
            color={state.isSubscribed ? "success" : "default"}
            variant="outlined"
          />
        )}
      </Stack>

      <Divider />

      {/* Flex-grows to fill whatever height the grid stretched this panel to
          — see the matching note on ServiceCard and the page's grid. Keeps a
          commute-and-LaaS admin's two panels the same height even though
          commute's summary carries more rows. */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {state.isLoading ? (
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={38} />
            <Skeleton variant="rounded" height={38} />
          </Stack>
        ) : state.isError ? (
          <ErrorNotice error={state.error} onRetry={state.retry}>
            Couldn&apos;t load {person}&apos;s {service.title} subscription.
          </ErrorNotice>
        ) : (
          <>
            {state.isSubscribed ? (
              <SubscriptionSummary
                service={service}
                record={state.record}
                distanceOptions={distanceOptions}
                laasCost={meta.laasCost}
                // The exemption follows the EMPLOYEE, not the admin — and the
                // token only carries the admin's groups. Passing false shows the
                // standard rate rather than inventing an exemption we cannot
                // check from here; the service bills correctly either way.
                isInExcludedGroup={false}
                serviceChargeMsg={gate.serviceChargeMsg}
              />
            ) : service.hasCommuteFields ? (
              <CommuteFields
                options={distanceOptions}
                value={fields}
                onChange={setFields}
                disabled={state.isSubmitting}
                showErrors={showErrors}
              />
            ) : (
              <PriceLine
                laasCost={meta.laasCost}
                isInExcludedGroup={false}
                serviceChargeMsg={gate.serviceChargeMsg}
              />
            )}

            {/* mt: "auto" carries the button to a common bottom edge — see
                the matching note on ServiceCard. */}
            <Box sx={{ mt: "auto", pt: 0.5 }}>
              <Button
                variant={optingIn ? "contained" : "outlined"}
                size="small"
                disabled={state.isSubmitting}
                onClick={openConfirm}
              >
                {optingIn ? "Subscribe" : "Unsubscribe"}
              </Button>
            </Box>
          </>
        )}
      </Box>

      <ConfirmSubscriptionDialog
        open={confirming}
        title={
          optingIn
            ? `Subscribe ${person} to ${service.title}?`
            : `Unsubscribe ${person} from ${service.title}?`
        }
        // The address, spelled out. An admin picking from a list of colleagues
        // with similar names needs to see exactly whose account is about to be
        // charged — and this acts on someone else's money.
        detail={
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {employee.workEmail}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This takes effect immediately, outside the usual opt-in and
              opt-out windows.
            </Typography>
          </Stack>
        }
        confirmLabel={optingIn ? "Subscribe" : "Unsubscribe"}
        busy={state.isSubmitting}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
