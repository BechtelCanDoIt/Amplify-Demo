/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import { Alert, Box, Typography } from "@wso2/oxygen-ui";
import RoutedTabs from "@components/routed-tabs/RoutedTabs";
import { CLAIM_APPROVAL_GATE_APPS, useFinanceGate } from "../api/useFinanceGate";
import {
  CLAIM_APPROVAL_PATH,
  CLAIM_APPROVAL_TABS,
  firstAllowedClaimTab,
  type ClaimApprovalGateId,
} from "./claimApprovalTabs";

// FinanceShell's own fillColumn, verbatim.
const fillColumn = { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } as const;

// `useFillHeight` (the OPD and Expense review screens, and this tab's own
// Needs You review) measures against the nearest scrolling ANCESTOR. Without
// one of its own, that search climbs past this page entirely and lands on
// whatever AppLayout happens to scroll — which grows with the page instead of
// staying inside it, an external scrollbar on the whole screen instead of an
// internal one on the panel. `overflowY: "auto"` here is what gives it one to
// find, the same way the Me-side claims tabs scroll their own list instead of
// the page. Every tab needs this, not only the one that happens to hold a
// DataGrid.
const scrollBoundary = { ...fillColumn, overflowY: "auto" } as const;

// One frame for every claim-approval view: the header, the tab bar, and an
// <Outlet /> for whichever tab the URL names.
//
// Not FinanceShell: that frame belongs to one app and names one backend in its
// "not connected" message. This screen spans two, and either may be missing, so
// each tab reports its own connectivity where it knows about it.
export default function ClaimApprovalPage() {
  // Scoped: everything below renders behind `gate.isResolving`, so a backend
  // this screen does not read could otherwise hold it blank while it answers.
  const gate = useFinanceGate(true, CLAIM_APPROVAL_GATE_APPS);
  const visible = CLAIM_APPROVAL_TABS.filter((t) => gate.canSee(t.gateId));

  return (
    <Box sx={fillColumn}>
      {/* No chip. This is a bare section under the Finance perspective, not a
          screen inside an app, so there is no app name to put above the title —
          the chip said "Finance", which is the perspective the rail already
          shows. "Claim approval" identifies itself. */}
      <Typography variant="h5" sx={{ mb: 0.5, flexShrink: 0 }}>
        Claim Approval
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch", flexShrink: 0 }}>
        Claims waiting on your decision, and the ones already decided. Submitting a claim and looking
        up your own stay under Me.
      </Typography>

      {/* Nothing rendered while resolving — not even a skeleton. The rail
          itself does not wait on this same gate (it renders what it knows and
          fills the rest in), but THIS page has only two answers once it
          settles — tabs, or "nothing here" — and no fixed shape to hold a
          placeholder's place between them, so a skeleton here would be the
          one thing left to blink on the way to a final answer. */}
      {gate.isResolving ? null : visible.length === 0 ? (
        <Alert severity="info">You don&apos;t approve claims, so there is nothing here.</Alert>
      ) : (
        <Box sx={fillColumn}>
          <Box sx={{ flexShrink: 0 }}>
            <RoutedTabs
              basePath={CLAIM_APPROVAL_PATH}
              tabs={visible}
              ariaLabel="Claim approval sections"
            />
          </Box>
          <Box sx={scrollBoundary}>
            <Outlet />
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * The index route: sends the visitor to the first tab they may open.
 *
 * Its own `isResolving` branch, despite the page above holding the <Outlet />
 * behind one already. That is a DIFFERENT `useFinanceGate()` — a hook call has
 * state of its own, and identity resolution starts over for each one — so this
 * component mounts fresh, the instant the page's gate settles, with its own
 * still unsettled. For the render or two that takes, `canSee` answers no to
 * everything and this redirected an approver away from the tab they were
 * entitled to. A redirect is not undone when the answer arrives.
 */
export function ClaimApprovalIndex() {
  const gate = useFinanceGate(true, CLAIM_APPROVAL_GATE_APPS);
  if (gate.isResolving) return null;
  const first = firstAllowedClaimTab(gate.canSee);
  if (!first) return null; // the page already explains this case
  return <Navigate to={`${CLAIM_APPROVAL_PATH}/${first.segment}`} replace />;
}

/**
 * Guards one tab's route. A tab the gate refuses is not merely absent from the
 * bar — reaching its URL directly redirects to whatever this person may see, or
 * says so plainly when that is nothing. Hiding a tab is not access control.
 */
export function ClaimApprovalTabRoute({
  gateId,
  children,
}: {
  gateId: ClaimApprovalGateId;
  children: ReactNode;
}) {
  const gate = useFinanceGate(true, CLAIM_APPROVAL_GATE_APPS);

  // An unresolved gate reports no roles, and this component decides between
  // "your tab" and "not available for your role" with no third answer — so
  // without this it announced the refusal first and the tab a moment later.
  // That is the flicker on this screen: the approver DID get in, they were
  // just told they hadn't on the way.
  //
  // This gate is not the page's above but a fresh one, mounted the moment the
  // page's own settled and unsettled again for its first render or two — which
  // is why the page's guard never covered this one. Nothing rendered while it
  // resolves, matching the page: a refusal withdrawn a moment later is worse
  // than a beat of nothing, and the refusal here is the load-bearing one — it
  // is what a non-approver is left with.
  if (gate.isResolving) return null;

  if (!gate.canSee(gateId)) {
    const first = firstAllowedClaimTab(gate.canSee);
    if (first) return <Navigate to={`${CLAIM_APPROVAL_PATH}/${first.segment}`} replace />;
    return <Alert severity="info">This isn&apos;t available for your role.</Alert>;
  }
  return <>{children}</>;
}
