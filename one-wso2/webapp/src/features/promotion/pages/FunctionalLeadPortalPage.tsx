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

// The Functional Lead Portal — ports promotion-app's own
// functionalLead.tsx ("Functional Lead Portal", route.ts: allowRoles:
// [Role.FUNCTIONAL_LEAD]). Four tabs, matching source's own tab bar order
// exactly: Active Promotion Requests, Approved Requests, Rejected
// Requests, Time Based Promotions.
import { Navigate, Outlet } from "react-router";
import { Box, Typography } from "@wso2/oxygen-ui";
import RoutedTabs, { type RoutedTabDef } from "@components/routed-tabs/RoutedTabs";

const BASE_PATH = "/people-ops/promotion/functional-lead";

const TABS: RoutedTabDef[] = [
  { segment: "active", label: "Active Promotion Requests" },
  { segment: "approved", label: "Approved Requests" },
  { segment: "rejected", label: "Rejected Requests" },
  { segment: "time-based", label: "Time Based Promotions" },
];

export default function FunctionalLeadPortalPage() {
  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        Functional Lead Portal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
        Review promotion requests from your business unit, and track them through approval, rejection, and
        time-based promotions.
      </Typography>
      <RoutedTabs basePath={BASE_PATH} tabs={TABS} ariaLabel="Functional lead portal" />
      <Outlet />
    </Box>
  );
}

/** The group's index route — sends straight to Active Promotion Requests,
 * source's own first/default tab. */
export function FunctionalLeadPortalIndex() {
  return <Navigate to={`${BASE_PATH}/active`} replace />;
}
