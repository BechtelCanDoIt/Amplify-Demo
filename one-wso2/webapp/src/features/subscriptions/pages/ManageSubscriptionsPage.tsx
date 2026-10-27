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
import { Alert, Avatar, Box, Card, Stack, Typography } from "@wso2/oxygen-ui";
import {
  SERVICES,
  type ServiceKey,
  type SubscriptionEmployee,
} from "../api/subscriptionTypes";
import { useSubscriptionGate } from "../api/useSubscriptionGate";
import { useSubscriptionsMetaInfo } from "../api/useSubscriptionData";
import AdminServicePanel from "../components/AdminServicePanel";
import SubscriptionEmployeePicker, {
  fullName,
  initials,
} from "../components/SubscriptionEmployeePicker";
import SubscriptionsShell from "../components/SubscriptionsShell";

// Subscribe and unsubscribe other employees — the admin half of the
// subscription app.
//
// Who sees this, and why it is not a `requires: ["admin"]` in the registry:
// the two admin groups here are Asgardeo groups belonging to the SUBSCRIPTION
// service (their names come back on /subscriptions/meta-info), not people-app
// privilege numbers. A People Ops admin is not automatically a commute or LaaS
// admin, and a commute admin need not be a People Ops admin at all. The rail
// and this page both ask useSubscriptionGate; the service re-checks the same
// groups on every call it receives.
//
// The two groups are INDEPENDENT, which is why the panels are filtered one by
// one rather than shown as a pair: someone who administers commute but not
// LaaS gets the commute panel alone. Showing both would offer a control whose
// every press returns 403.
export default function ManageSubscriptionsPage() {
  const gate = useSubscriptionGate();
  const meta = useSubscriptionsMetaInfo();
  const [employee, setEmployee] = useState<SubscriptionEmployee | null>(null);

  const canManage: Record<ServiceKey, boolean> = {
    commute: gate.isCommuteAdmin,
    meal: gate.isLunchAdmin,
  };
  const services = SERVICES.filter((s) => canManage[s.key]);

  return (
    <SubscriptionsShell
      title="Manage subscriptions"
      subtitle="Subscribe or unsubscribe an employee on their behalf. These changes take effect immediately — the monthly opt-in and opt-out windows don't apply to admins."
      gate={gate}
      requireAdmin
    >
      {!meta.data ? null : (
        <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
          <Box>
            <SubscriptionEmployeePicker
              value={employee}
              onChange={setEmployee}
              // The roster endpoint 403s a non-admin, and the shell has
              // already established that this caller isn't one.
              enabled={gate.isAdmin}
            />
          </Box>

          {employee ? (
            <>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  // Matches the panel grid below: a single card there is
                  // capped to 442px rather than the Stack's full 900px, so
                  // this card follows the same width — otherwise a
                  // commute-only or LaaS-only admin would see a full-width
                  // employee row sitting above one narrow panel, unaligned
                  // with it on the right edge.
                  maxWidth: services.length > 1 ? undefined : 442,
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Avatar
                    src={employee.employeeThumbnail ?? undefined}
                    // Some thumbnails resolve to Google's avatar CDN, which
                    // refuses a request carrying our referrer.
                    slotProps={{ img: { referrerPolicy: "no-referrer" } }}
                    sx={{ width: 40, height: 40, fontWeight: 700 }}
                  >
                    {initials(employee)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{fullName(employee)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {employee.workEmail}
                    </Typography>
                  </Box>
                </Stack>
              </Card>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    // A lone panel gets a fixed-width column rather than the
                    // full row: `1fr` here would still be 100% of the
                    // container's width (it's the ONLY track), which is a
                    // commute-only or LaaS-only admin's actual, common case —
                    // stretching one small card edge-to-edge looked broken,
                    // not deliberate. 442px matches what one card is already
                    // sized at in the two-panel case below (and in the
                    // self-service grid): (900 max-width - 16px gap) / 2.
                    md: services.length > 1 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 442px)",
                  },
                  gap: 2,
                  // Stretch, for the same reason as the self-service grid:
                  // a commute-and-LaaS admin's two panels otherwise sit at
                  // whatever height their own content needs, which rarely
                  // matches. AdminServicePanel's flex-grow content area does
                  // the rest.
                  alignItems: "stretch",
                }}
              >
                {services.map((service) => (
                  <AdminServicePanel
                    // Per EMPLOYEE, not just per service: changing the
                    // selection remounts the panel, which discards the draft
                    // fields typed for the previous person rather than
                    // carrying them into the next one's subscription.
                    key={`${service.key}:${employee.workEmail}`}
                    service={service}
                    meta={meta.data}
                    gate={gate}
                    employee={employee}
                  />
                ))}
              </Box>
            </>
          ) : (
            <Alert severity="info">
              Pick an employee to see their subscriptions.
            </Alert>
          )}
        </Stack>
      )}
    </SubscriptionsShell>
  );
}
