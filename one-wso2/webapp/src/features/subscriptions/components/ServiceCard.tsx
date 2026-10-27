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
  Alert,
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
  type SubscriptionsMetaInfo,
} from "../api/subscriptionTypes";
import { useServiceSubscription } from "../api/useServiceSubscription";
import type { SubscriptionGate } from "../api/useSubscriptionGate";
import { actionWindow } from "../util/subscriptionWindows";
import { normalizeContactNumber } from "../util/contactNumber";
import CommuteFields, {
  commuteFieldsValid,
  type CommuteFieldsState,
} from "./CommuteFields";
import ConfirmSubscriptionDialog from "./ConfirmSubscriptionDialog";
import SubscriptionSummary, { PriceLine } from "./SubscriptionSummary";

// One service, for the signed-in employee.
//
// This is the screen the date windows belong to. Self-service opt-in and
// opt-out are each allowed only inside their own window — the service enforces
// it and answers 400 outside — so the card decides from the same four day
// boundaries the backend was configured with, and says which window applies
// whether or not it is open. The admin panel deliberately shares none of this:
// an admin acting for someone else bypasses the windows entirely.
//
// A closed window disables the button rather than hiding it. The control is
// the thing that explains the rule; removing it leaves a card that simply
// appears to do nothing.

const ICONS = {
  commute: BusFrontIcon,
  meal: UtensilsIcon,
} as const;

export default function ServiceCard({
  service,
  meta,
  gate,
  email,
  now,
}: {
  service: ServiceDef;
  meta: SubscriptionsMetaInfo;
  gate: SubscriptionGate;
  /** The signed-in user's work email — the subject of every call this card makes. */
  email: string | undefined;
  /** Read once by the page and passed down, so the window rules stay testable. */
  now: Date;
}) {
  const state = useServiceSubscription(service, email);
  const { showSuccess, showError } = useNotifications();

  const distanceOptions = distanceOptionsFrom(meta.distances);
  const [fields, setFields] = useState<CommuteFieldsState>({
    distanceRangeId: "",
    contactNumber: "",
  });
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const Icon = ICONS[service.key];
  const window = actionWindow(meta, state.isSubscribed, now);
  const optingIn = !state.isSubscribed;

  // Commute needs both fields before it can be sent; LaaS has nothing to fill
  // in. Only checked when opting IN — an opt-out carries no payload.
  const fieldsReady = !optingIn || !service.hasCommuteFields || commuteFieldsValid(fields);

  const openConfirm = () => {
    // Only opting IN has anything to validate — opting out sends no payload,
    // so there's nothing for CommuteFields to flag. Setting this
    // unconditionally used to mark the (already-empty) fields invalid on
    // every Opt out click too, and since nothing else clears it, that stale
    // `true` was still in effect on the very next render — the moment this
    // card flips to "not subscribed" and CommuteFields mounts for the empty
    // opt-in form, it opened already showing red errors on a form nobody
    // had touched yet.
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
        showSuccess(`You've opted in to ${service.title}.`);
        // Clear the form: the fields are now the subscription's, shown
        // read-only by the summary, and a stale draft behind them would
        // reappear on a later opt-out.
        setFields({ distanceRangeId: "", contactNumber: "" });
        setShowErrors(false);
      } else {
        await state.unsubscribe();
        showSuccess(`You've opted out from ${service.title}.`);
      }
      setConfirming(false);
    } catch (error) {
      // The dialog stays open on failure, so the action can be retried without
      // re-entering anything. describeError never surfaces a raw response body.
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
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
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

      {/* Flex-grows to fill whatever height the grid stretched this card to
          (see the `alignItems: "stretch"` note on the page's grid) — LaaS's
          one price line and Commute's three-row summary sit at the same top
          edge either way, and the `mt: "auto"` on the button below rides the
          extra space down to a common bottom edge instead of leaving it as a
          gap in the middle. */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {state.isLoading ? (
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={38} />
            <Skeleton variant="rounded" height={38} />
          </Stack>
        ) : state.isError ? (
          <ErrorNotice error={state.error} onRetry={state.retry}>
            Couldn&apos;t load your {service.title} subscription.
          </ErrorNotice>
        ) : (
          <>
            {state.isSubscribed ? (
              <SubscriptionSummary
                service={service}
                record={state.record}
                distanceOptions={distanceOptions}
                laasCost={meta.laasCost}
                isInExcludedGroup={gate.isInExcludedGroup}
                serviceChargeMsg={gate.serviceChargeMsg}
              />
            ) : service.hasCommuteFields ? (
              <CommuteFields
                options={distanceOptions}
                value={fields}
                onChange={setFields}
                // Pointless to fill in a form whose submit button can't fire.
                disabled={!window.open || state.isSubmitting}
                showErrors={showErrors}
              />
            ) : (
              <PriceLine
                laasCost={meta.laasCost}
                isInExcludedGroup={gate.isInExcludedGroup}
                serviceChargeMsg={gate.serviceChargeMsg}
              />
            )}

            {/* The window notice and the button move together, as one unit
                pinned to the card's bottom edge via `mt: "auto"` on THIS Box
                (not on the button alone) — a `mt: "auto"` on just the button
                left the notice itself floating right after the summary,
                which sits at a different height in every card (LaaS has one
                summary row, Commute has three), so the two cards' notices —
                and the buttons under them — landed on different lines. Now
                whichever card has less above it just gets more blank space
                above this whole group instead. */}
            <Box sx={{ mt: "auto", pt: 0.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Alert severity={window.open ? "success" : "info"}>
                {window.open
                  ? `The ${window.action} window is open until ${window.label.split(" to ")[1]}.`
                  : `You can ${window.action} between ${window.label}.`}
              </Alert>

              <Box>
                <Button
                  variant={optingIn ? "contained" : "outlined"}
                  size="small"
                  // Closed window only. An unfilled form still lets the click
                  // through, so pressing it reveals WHICH field is missing rather
                  // than leaving a dead button and no explanation.
                  disabled={!window.open || state.isSubmitting}
                  onClick={openConfirm}
                  // The visible label is just the verb (see below); a screen
                  // reader tabbing through two cards would otherwise hear "Opt
                  // in, button" twice with nothing to tell them apart.
                  aria-label={
                    optingIn ? `Opt in to ${service.title}` : `Opt out from ${service.title}`
                  }
                >
                  {/* Just the verb: the card's own header already names the
                      service, right above this button, so repeating it here
                      was saying the same thing twice within one card's width.
                      The confirmation dialog this opens still names it — once
                      it's a modal on its own, that context is gone. */}
                  {optingIn ? "Opt in" : "Opt out"}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Box>

      <ConfirmSubscriptionDialog
        open={confirming}
        title={
          optingIn ? `Opt in to ${service.title}?` : `Opt out from ${service.title}?`
        }
        detail={
          optingIn
            ? `You'll be billed monthly from the next cycle. You can opt out again between ${window.reverseLabel}.`
            : `Your ${service.title} subscription ends at the close of this cycle. You can opt back in between ${window.reverseLabel}.`
        }
        confirmLabel={optingIn ? "Opt in" : "Opt out"}
        busy={state.isSubmitting}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
