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

// The Lead Portal — ports promotion-app's own lead.tsx ("Time Based
// Promotions", route.ts: allowRoles: [Role.LEAD]). Two tabs, matching
// source's own tab bar exactly: Pending Requests (panels/recommendationList.tsx)
// and History (panels/recommendationHistory.tsx). Lives under People Ops —
// reviewing/deciding on other people's promotions is People-Ops-team work,
// the same split PAR's own Lead Portal already applies.
import { Navigate, Outlet, useLocation } from "react-router";
import { Box, Typography } from "@wso2/oxygen-ui";
import RoutedTabs, { type RoutedTabDef } from "@components/routed-tabs/RoutedTabs";
import { useActivePromotionCycle } from "../api/usePromotionCycle";

const BASE_PATH = "/people-ops/promotion/lead";

const TABS: RoutedTabDef[] = [
  { segment: "pending", label: "Pending Requests" },
  { segment: "history", label: "History" },
];

// No open cycle: Pending Requests has nothing to act on, so History is the
// only tab.
const HISTORY_ONLY_TABS: RoutedTabDef[] = [{ segment: "history", label: "History" }];

export default function LeadPortalPage() {
  const cycle = useActivePromotionCycle();
  const { pathname } = useLocation();
  const noActiveCycle = !cycle.isPending && !cycle.isError && !cycle.cycle;

  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        Time Based Promotions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
        Review and act on your direct reports' time-based promotion requests, and track them once decided.
      </Typography>
      {!cycle.isPending && (
        <RoutedTabs basePath={BASE_PATH} tabs={noActiveCycle ? HISTORY_ONLY_TABS : TABS} ariaLabel="Time based promotions" />
      )}
      {noActiveCycle && pathname.startsWith(`${BASE_PATH}/pending`) ? (
        <Navigate to={`${BASE_PATH}/history`} replace />
      ) : (
        <Outlet />
      )}
    </Box>
  );
}

/** The group's index route — sends straight to Pending Requests, the first
 * tab, or to History when no cycle is open. */
export function LeadPortalIndex() {
  const cycle = useActivePromotionCycle();
  if (cycle.isPending) return null;
  const noActiveCycle = !cycle.isError && !cycle.cycle;
  return <Navigate to={`${BASE_PATH}/${noActiveCycle ? "history" : "pending"}`} replace />;
}
