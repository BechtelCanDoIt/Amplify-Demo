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
import { Navigate } from "react-router";
import { Box } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { usePromotionPrivileges } from "../api/usePromotionRoles";

// Gates the Promotion Board Portal on promotion-app's own
// Role.PROMOTION_BOARD_MEMBER (route.ts: allowRoles:
// [Role.PROMOTION_BOARD_MEMBER]), read back from GET /employee-privileges —
// the same presentation-only pattern PromotionRequiresFunctionalLeadRoute
// already uses for Role.FUNCTIONAL_LEAD. Every endpoint this portal calls
// re-derives PROMOTION_BOARD_MEMBER from the JWT server-side, so a stale or
// slow fetch here can only hide the portal from a real board member, never
// grant access it shouldn't.
export default function PromotionRequiresPromotionBoardRoute({ children }: { children: ReactNode }) {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const workEmail = userInfo.data?.workEmail ?? asgardeoUser.email;
  const gate = usePromotionPrivileges(workEmail);

  if (gate.isLoading) return null;
  if (gate.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <ErrorNotice error={gate.error} onRetry={() => gate.refetch()} retrying={gate.isFetching}>
          Couldn&apos;t check whether you&apos;re a promotion board member.
        </ErrorNotice>
      </Box>
    );
  }
  if (!gate.isPromotionBoardMember) return <Navigate to="/me" replace />;
  return <>{children}</>;
}
