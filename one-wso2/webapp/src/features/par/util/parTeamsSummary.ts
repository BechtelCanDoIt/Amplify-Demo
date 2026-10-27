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

import type { ParTeamSummary } from "../api/types";

export interface ParTeamsCompletionTotals {
  totalEmployees: number;
  totalEmployeeParComplete: number;
  totalLeadReviewComplete: number;
  totalF2fComplete: number;
}

// Ports utils/utils.ts's calculateAllTeamsSummary — sums each team's own
// counts across every team a lead owns, for MultiTeamSummary's aggregate
// "Completion Status" cards (a lead with several teams sees one combined
// figure, not one per team).
export function calculateTeamsCompletionTotals(teams: ParTeamSummary[]): ParTeamsCompletionTotals {
  return teams.reduce(
    (totals, team) => ({
      totalEmployees: totals.totalEmployees + team.numberOfTeamMembers,
      totalEmployeeParComplete: totals.totalEmployeeParComplete + team.summary.employeeParCompletedCount,
      totalLeadReviewComplete: totals.totalLeadReviewComplete + team.summary.leadsReviewCompletedCount,
      totalF2fComplete: totals.totalF2fComplete + team.summary.f2fCompletedCount,
    }),
    { totalEmployees: 0, totalEmployeeParComplete: 0, totalLeadReviewComplete: 0, totalF2fComplete: 0 },
  );
}
