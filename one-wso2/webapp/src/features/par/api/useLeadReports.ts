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

import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { authedGet, defaultQueryRetry } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { parBackendUrl, parServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";
import type { ParAdditionalReport, ParChainReport } from "./types";

// GET the direct AND indirect reports of a lead — EmployeeReportView.tsx's
// own fetchDirectAndIndirectReports. The Additional Reports tab filters this
// down to the indirect ones client-side, same as source.
export function useParAdditionalReports(parCycleId: number | undefined, leadEmail: string | undefined) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = Boolean(parBackendUrl);
  return useQuery<ParAdditionalReport[]>({
    queryKey: ["par-additional-reports", parCycleId, leadEmail],
    enabled: isSignedIn && backendConfigured && Boolean(parCycleId) && Boolean(leadEmail),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<ParAdditionalReport[]>(
        parServiceUrls.parAdditionalReports(parCycleId!, leadEmail!),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}

// GET one drill-down level of the report chain — ReportChainView.tsx's own
// fetchDirectEmployeePars. `leadEmail` is whichever email the breadcrumb
// trail currently points at, not always the caller's own; the backend
// allows this as long as that email is somewhere in the caller's own
// reporting chain (isEmployeeInReportingChain).
export function useParReportLevels(parCycleId: number | undefined, leadEmail: string | undefined) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = Boolean(parBackendUrl);
  return useQuery<ParChainReport[]>({
    queryKey: ["par-report-levels", parCycleId, leadEmail],
    enabled: isSignedIn && backendConfigured && Boolean(parCycleId) && Boolean(leadEmail),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<ParChainReport[]>(
        parServiceUrls.parReportLevels(parCycleId!, leadEmail!),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}
