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

// Gates Promotion Cycle History on EITHER promotion-app's Role.HR_ADMIN OR
// Role.FUNCTIONAL_LEAD (route.ts: allowRoles: [Role.HR_ADMIN,
// Role.FUNCTIONAL_LEAD]) — the one screen in this app two different roles
// both reach directly, each seeing a differently-scoped result (org-wide
// for HR_ADMIN, the caller's own BU access for FUNCTIONAL_LEAD — see
// CycleHistoryTab's own comment). Presentation only, same as every other
// guard here.
export default function PromotionRequiresCycleHistoryRoute({ children }: { children: ReactNode }) {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const workEmail = userInfo.data?.workEmail ?? asgardeoUser.email;
  const gate = usePromotionPrivileges(workEmail);

  if (gate.isLoading) return null;
  if (gate.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <ErrorNotice error={gate.error} onRetry={() => gate.refetch()} retrying={gate.isFetching}>
          Couldn&apos;t check your promotion access.
        </ErrorNotice>
      </Box>
    );
  }
  if (!gate.isHrAdmin && !gate.isFunctionalLead) return <Navigate to="/me" replace />;
  return <>{children}</>;
}
