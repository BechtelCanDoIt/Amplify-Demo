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

// Gates the Lead Portal on promotion-app's own Role.LEAD (route.ts:
// allowRoles: [Role.LEAD]), read back from GET /employee-privileges the
// same way PAR's ParRequiresLeadRoute reads isTeamLead — presentation
// only. Every recommendation endpoint re-derives the caller's role from the
// JWT server-side and 403s a caller who doesn't hold it (service.bal's own
// authorization block on GET/PATCH/submit/decline), so a stale or slow
// fetch here can only hide the portal from a real lead, never grant access
// it shouldn't.
//
// Fails closed while loading (renders nothing, same as ParRequiresLeadRoute
// — no flash of the portal before the check resolves) and never silently
// redirects on a fetch failure, since that would read as "not a lead" to
// someone who genuinely is one.
export default function PromotionRequiresLeadRoute({ children }: { children: ReactNode }) {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const workEmail = userInfo.data?.workEmail ?? asgardeoUser.email;
  const gate = usePromotionPrivileges(workEmail);

  if (gate.isLoading) return null;
  if (gate.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <ErrorNotice error={gate.error} onRetry={() => gate.refetch()} retrying={gate.isFetching}>
          Couldn&apos;t check whether you&apos;re a lead.
        </ErrorNotice>
      </Box>
    );
  }
  if (!gate.isLead) return <Navigate to="/me" replace />;
  return <>{children}</>;
}
