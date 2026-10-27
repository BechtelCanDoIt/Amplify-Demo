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

// Team Promotion History — ports promotion-app's own
// view/leadEmployeeHistory/leadEmployeeHistory.tsx ("Team Promotion
// History", route.ts: allowRoles: [Role.LEAD]). A separate top-level screen
// from the Lead Portal (lead.tsx, "Time Based Promotions") in source, kept
// separate here too rather than folded into it as a third tab.
import { useState } from "react";
import { Navigate, Outlet } from "react-router";
import { Box, InputAdornment, TextField, Typography } from "@wso2/oxygen-ui";
import { SearchIcon } from "@wso2/oxygen-ui-icons-react";
import RoutedTabs, { type RoutedTabDef } from "@components/routed-tabs/RoutedTabs";

const BASE_PATH = "/people-ops/promotion/team-history";

const TABS: RoutedTabDef[] = [
  { segment: "direct-reports", label: "Direct Reportings" },
  { segment: "indirect-reports", label: "Indirect Reportings" },
];

export default function TeamPromotionHistoryPage() {
  const [searchKey, setSearchKey] = useState("");

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap", mb: 2.25 }}>
        <Box>
          <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
            Team Promotion History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            See every promotion your direct and indirect reports have received, past and present.
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search"
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          sx={{ width: 280 }}
          slotProps={{
            htmlInput: { "aria-label": "Search team promotion history" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={16} aria-hidden="true" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <RoutedTabs basePath={BASE_PATH} tabs={TABS} ariaLabel="Team promotion history" />
      <Outlet context={searchKey} />
    </Box>
  );
}

/** The group's index route — sends straight to Direct Reportings, source's
 * own first/default tab. */
export function TeamPromotionHistoryIndex() {
  return <Navigate to={`${BASE_PATH}/direct-reports`} replace />;
}
