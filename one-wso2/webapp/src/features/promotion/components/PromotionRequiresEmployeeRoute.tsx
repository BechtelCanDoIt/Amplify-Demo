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
import { useMeProfile } from "@features/my/api/useMeProfile";
import { promotionEmployeeAccess } from "../util/promotionEmployeeAccess";

// Gates Me → Promotion on the employee's own employment type, the same
// check the rail applies to hide the item (promotionVisibility) — hiding the
// menu row is not the only thing enforcing it.
//
// Renders nothing while the profile loads (no flash of the page before the
// check resolves) and shows an error with a retry when the profile fails,
// rather than redirecting: a redirect would read as "not eligible" to
// someone whose profile simply didn't load.
export default function PromotionRequiresEmployeeRoute({ children }: { children: ReactNode }) {
  const profile = useMeProfile();
  const access = promotionEmployeeAccess(profile.data?.employee?.employmentType, profile.isPending);

  if (access.isLoading) return null;
  if (profile.isError) {
    return (
      <Box sx={{ p: 2 }}>
        <ErrorNotice error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isFetching}>
          Couldn&apos;t load your profile.
        </ErrorNotice>
      </Box>
    );
  }
  if (!access.canSee) return <Navigate to="/me" replace />;
  return <>{children}</>;
}
