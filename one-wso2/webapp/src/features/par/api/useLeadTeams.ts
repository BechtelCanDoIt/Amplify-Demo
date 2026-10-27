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
import type { ParTeamDetails, ParTeamSummary } from "./types";

// GET the teams this lead owns for one cycle — LeadOngoingPanel.tsx's own
// first fetch (fetchTeams). A lead with exactly one team skips straight to
// it; more than one shows the team-picker grid first — see LeadPortalPage.
export function useParTeams(parCycleId: number | undefined, leadEmail: string | undefined) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = Boolean(parBackendUrl);
  return useQuery<ParTeamSummary[]>({
    queryKey: ["par-teams", parCycleId, leadEmail],
    enabled: isSignedIn && backendConfigured && Boolean(parCycleId) && Boolean(leadEmail),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<ParTeamSummary[]>(
        parServiceUrls.parTeams(parCycleId!, leadEmail!),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}

// GET one team's roster — TeamSummary.tsx's own fetchTeamReport. Only fires
// once a team is actually picked (or the lead's only team is known).
export function useParTeamDetails(parCycleId: number | undefined, parTeamId: number | undefined) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const backendConfigured = Boolean(parBackendUrl);
  return useQuery<ParTeamDetails>({
    queryKey: ["par-team-details", parCycleId, parTeamId],
    enabled: isSignedIn && backendConfigured && Boolean(parCycleId) && Boolean(parTeamId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return authedGet<ParTeamDetails>(
        parServiceUrls.parTeamDetails(parCycleId!, parTeamId!),
        accessToken,
        digiopsHeaders(),
      );
    },
    staleTime: 60 * 1000,
    retry: defaultQueryRetry,
  });
}
