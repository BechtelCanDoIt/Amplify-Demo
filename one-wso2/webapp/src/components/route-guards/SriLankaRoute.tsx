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

import type { JSX, ReactNode } from "react";
import { Box } from "@wso2/oxygen-ui";
import { Navigate } from "react-router";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useUserInfo } from "@api/useUserInfo";
import { useSriLankaEmployee } from "@hooks/useSriLankaEmployee";

/**
 * Closes a Colombo-office screen to everyone else, at the route.
 *
 * Hiding the rail row and the tab was only half of it: every one of these paths
 * was still mounted unconditionally in App.tsx, so `/me/menu`, `/me/claims/opd`
 * and the two subscription screens opened for anyone who typed or bookmarked
 * them. SRI_LANKA_ONLY_ITEM_IDS decides what the MENU offers; this decides what
 * the routes allow, and both read the same /user-info.
 *
 * Same shape as ParRequiresTeamLeadRoute, including the two things it gets
 * right and a redirect is easy to get wrong:
 *
 *  - Wait rather than refuse. Unresolved reads as "not Sri Lanka", and
 *    redirecting on that would throw a Colombo employee off their own screen on
 *    every cold load.
 *  - A failed lookup is not a refusal. Say the check failed and offer a retry —
 *    silently redirecting would send someone away with nothing to act on.
 */
export default function SriLankaRoute({ children }: { children: ReactNode }): JSX.Element | null {
  const userInfo = useUserInfo();
  const { isSriLanka, isResolving } = useSriLankaEmployee();

  if (isResolving) return null;

  if (userInfo.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <ErrorNotice
          error={userInfo.error}
          onRetry={() => void userInfo.refetch()}
          retrying={userInfo.isFetching}
        >
          Couldn&apos;t check where you work.
        </ErrorNotice>
      </Box>
    );
  }

  // To Me, not to a refusal page. The rail is already not offering this screen,
  // so there is nothing here to explain — and Me is where every employee can go.
  if (!isSriLanka) return <Navigate to="/me" replace />;

  return <>{children}</>;
}
