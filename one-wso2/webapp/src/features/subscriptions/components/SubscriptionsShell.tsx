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

import type { ReactNode } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { isSubscriptionBackendConfigured } from "../api/useSubscriptionData";
import type { SubscriptionGate } from "../api/useSubscriptionGate";

// Page frame for both subscription screens.
//
// Same state ladder as PeopleOpsShell and MenuShell, deliberately — the
// perspectives should degrade in one vocabulary rather than each inventing its
// own:
//
//   1. backend URL not set  → name the missing config key
//   2. gate still resolving → spinner, never a premature denial
//   3. gate failed          → an error with a retry, NOT a denial
//   4. decided: not an admin → say plainly that access is missing
//
// Steps 3 and 4 stay apart for the reason the sibling shells give: collapsing
// them tells someone whose request merely timed out that they lack a
// privilege, and sends them off chasing an Asgardeo group they already hold.
//
// `requireAdmin` is off by default here, the opposite of PeopleOpsShell. The
// self-service page is the common case and is open to every employee — opting
// yourself in is not an HR-team action — so the admin screen is the one that
// opts in to the gate.
export default function SubscriptionsShell({
  title,
  subtitle,
  gate,
  requireAdmin = false,
  children,
}: {
  // An icon + label rather than a string with an emoji in it: a colour emoji
  // sits inside the chip as its own palette and reads as pasted-in, where a
  // Lucide icon inherits the chip's colour. Same shape as the sibling shells.
  title: string;
  subtitle?: ReactNode;
  gate: SubscriptionGate;
  requireAdmin?: boolean;
  children: ReactNode;
}) {
  return (
    <Box>
      {/* No parent chip. Both screens under this shell — "My subscriptions"
          and "Manage subscriptions" — already carry the app's name in their
          own title, so a "Subscriptions" chip above said it a second time.
          A chip earns its place only above a title that would not identify the
          screen alone ("Dashboard", "History", "Settings"). */}
      {/* A real h1: the page's heading, so heading navigation has a landmark. */}
      <Typography component="h1" variant="h5" sx={{ mb: 0.5, mt: 0 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2.25, maxWidth: "70ch" }}
        >
          {subtitle}
        </Typography>
      )}

      <SubscriptionsBody gate={gate} requireAdmin={requireAdmin}>
        {children}
      </SubscriptionsBody>
    </Box>
  );
}

// Split out so the header stays readable — the ladder carries the logic and
// reads better as a sequence of guards than as nested ternaries in JSX.
function SubscriptionsBody({
  gate,
  requireAdmin,
  children,
}: {
  gate: SubscriptionGate;
  requireAdmin: boolean;
  children: ReactNode;
}) {
  if (!isSubscriptionBackendConfigured()) {
    return (
      <Alert severity="info" sx={{ mt: 1.5 }}>
        Subscriptions aren&apos;t connected yet. Set{" "}
        <code>ONE_WSO2_SUBSCRIPTION_BACKEND_URL</code> in{" "}
        <code>public/config.js</code> (the backend URL) and reload.
      </Alert>
    );
  }

  // Both screens wait for the gate, not just the admin one: the self-service
  // page needs the same meta-info for its prices and windows, so rendering
  // before it lands would show a card with no price and a window it can't
  // name.
  if (gate.isResolving) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading subscription details…
        </Typography>
      </Stack>
    );
  }

  // Checked BEFORE the denial below. A failed request also leaves us holding
  // no groups, so this order is what stops a gateway timeout from being
  // reported as a missing permission.
  if (gate.isError) {
    return (
      <ErrorNotice onRetry={gate.retry} sx={{ mt: 1.5 }}>
        Couldn&apos;t load your subscription details. {gate.errorMessage}
      </ErrorNotice>
    );
  }

  if (requireAdmin && !gate.isAdmin) {
    return (
      <Alert severity="warning" sx={{ mt: 1.5 }}>
        You don&apos;t have access to manage subscriptions for other people.
        That&apos;s limited to the commute and LaaS admin teams — ask them if
        you need access. You can still manage your own subscriptions.
      </Alert>
    );
  }

  return <>{children}</>;
}
