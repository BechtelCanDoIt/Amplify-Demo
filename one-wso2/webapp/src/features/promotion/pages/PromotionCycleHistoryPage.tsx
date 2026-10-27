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

// Promotion Cycle History — ports promotion-app's own
// view/promotionCycleHistory/promotionCycleHistory.tsx ("Promotion Cycle
// History", route.ts: allowRoles: [Role.HR_ADMIN, Role.FUNCTIONAL_LEAD]).
// Two tabs, matching source's own tab bar order exactly: By Promotion
// Cycle, People HR Archive.
import { Navigate, Outlet } from "react-router";
import { Box, Typography } from "@wso2/oxygen-ui";
import RoutedTabs, { type RoutedTabDef } from "@components/routed-tabs/RoutedTabs";

const BASE_PATH = "/people-ops/promotion/cycle-history";

const TABS: RoutedTabDef[] = [
  { segment: "by-cycle", label: "By Promotion Cycle" },
  { segment: "people-hr-archive", label: "People HR Archive" },
];

export default function PromotionCycleHistoryPage() {
  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        Promotion Cycle History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
        Look back at closed promotion cycles and the full People HR promotion archive.
      </Typography>
      <RoutedTabs basePath={BASE_PATH} tabs={TABS} ariaLabel="Promotion cycle history" />
      <Outlet />
    </Box>
  );
}

/** The group's index route — sends straight to By Promotion Cycle, source's
 * own first/default tab. */
export function PromotionCycleHistoryIndex() {
  return <Navigate to={`${BASE_PATH}/by-cycle`} replace />;
}
