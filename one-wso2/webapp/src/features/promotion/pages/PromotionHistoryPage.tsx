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

// Standalone /me/promotion — an employee's own full promotion history,
// restricted to the EMPLOYEE role.
//
// Promotion History shows a page title and a timeline. A tab strip is
// unnecessary because this page has no sibling views.
//
// This is the fuller, dedicated view of an employee's promotion record. It
// reads the same two endpoints as the My-page profile card's "Last
// promotion" line + history dialog (features/my/components/
// ConnectedServices.tsx, PromotionHistoryDialog.tsx), which stays as its
// own, separately-designed summary widget rather than being replaced by
// this page.
import { Alert, Box, Skeleton, Typography } from "@wso2/oxygen-ui";
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { humanizeHttpError } from "@api/http";
import { isPromotionBackendConfigured, usePromotionEmployeeInfo } from "../api/usePromotionEmployeeInfo";
import { usePromotionHistory } from "../api/usePromotionHistory";
import PromotionTimeline from "../components/PromotionTimeline";

export default function PromotionHistoryPage() {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  // Same email-resolution order as the profile card: /user-info's workEmail
  // is canonical, falling back to the id_token email claim while it loads.
  const workEmail = userInfo.data?.workEmail ?? asgardeoUser.email;

  const configured = isPromotionBackendConfigured();
  const info = usePromotionEmployeeInfo(workEmail);
  const history = usePromotionHistory(workEmail, true);

  return (
    <Box>
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        Promotion History
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Every promotion you've been approved for, from the job band you joined at to where you are today.
      </Typography>

      {!configured ? (
        <Alert severity="info">
          This app isn&apos;t connected yet. Set <code>ONE_WSO2_PROMOTION_BACKEND_URL</code> in{" "}
          <code>public/config.js</code> and reload.
        </Alert>
      ) : info.isPending || history.isPending ? (
        // isPending, not isLoading: both queries stay `enabled: false` until
        // workEmail resolves, and isLoading (isPending && isFetching) reads
        // false during that window — see OrgChartPage.tsx's own comment on
        // this exact gap. Without this the page would render blank for a
        // beat on load instead of the skeleton below.
        <Box>
          <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 1, mb: 2 }} />
          <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 1 }} />
        </Box>
      ) : info.isError ? (
        <Alert severity="error">Couldn&apos;t load your employee record. {humanizeHttpError(info.error)}</Alert>
      ) : history.isError ? (
        <Alert severity="error">Couldn&apos;t load your promotion history. {humanizeHttpError(history.error)}</Alert>
      ) : info.data ? (
        <PromotionTimeline
          employeeInfo={info.data.employeeInfo}
          requests={history.data?.promotionRequests ?? []}
        />
      ) : null}
    </Box>
  );
}
