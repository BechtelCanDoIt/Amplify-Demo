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

// The Admin Portal — ports promotion-app's own view/administration/
// administration.tsx ("Admin Portal", route.ts: allowRoles: [Role.HR_ADMIN]).
// Five tabs, matching source's own tab bar order exactly: Promotion Cycle,
// Time Based Promotions, Individual Contributor Promotion, Withdrawal
// Requests, User Management.
import { Navigate, Outlet } from "react-router";
import { Box, Typography } from "@wso2/oxygen-ui";
import RoutedTabs, { type RoutedTabDef } from "@components/routed-tabs/RoutedTabs";

const BASE_PATH = "/people-ops/promotion/admin";

const TABS: RoutedTabDef[] = [
  { segment: "cycle", label: "Promotion Cycle" },
  { segment: "time-based", label: "Time Based Promotions" },
  { segment: "individual-contributor", label: "Individual Contributor Promotion" },
  { segment: "withdrawal-requests", label: "Withdrawal Requests" },
  { segment: "users", label: "User Management" },
];

export default function PromotionAdminPortalPage() {
  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        Admin Portal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
        Manage promotion cycles, time-based and individual contributor promotions, withdrawal requests, and
        system users.
      </Typography>
      <RoutedTabs basePath={BASE_PATH} tabs={TABS} ariaLabel="Promotion admin portal" />
      <Outlet />
    </Box>
  );
}

/** The group's index route — sends straight to Promotion Cycle, the
 * first and default tab. */
export function PromotionAdminPortalIndex() {
  return <Navigate to={`${BASE_PATH}/cycle`} replace />;
}
