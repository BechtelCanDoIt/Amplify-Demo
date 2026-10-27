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

import { deriveLegacyCycleDates, formatLegacyCycleName, hasLegacyContent } from "./parLegacyHistory";
import { resolveLegacyRating } from "./legacyParRatingResolvers";
import type { ParCycle, ParLegacyCycleSummary, ParLegacyHistory } from "../api/types";

export interface AdminHistoryRow {
  key: string;
  cycleName: string;
  startDate: string | null;
  endDate: string | null;
  isLegacy: boolean;
  parCycleId?: number;
}

// Ports HistoryPanel.tsx's own mergedRows: every closed real cycle plus one
// row per distinct legacy cycle, latest end date first. An entry with no
// derivable end date (never expected in practice) sorts to the very end
// rather than the top.
export function buildAdminHistoryRows(closedCycles: ParCycle[], legacyCycles: ParLegacyCycleSummary[]): AdminHistoryRow[] {
  const rows: AdminHistoryRow[] = [
    ...closedCycles.map((cycle) => ({
      key: `cycle-${cycle.parCycleId}`,
      cycleName: cycle.parCycleName,
      startDate: cycle.parCycleStartDate,
      endDate: cycle.parCycleEndDate,
      isLegacy: false,
      parCycleId: cycle.parCycleId,
    })),
    ...legacyCycles.map((cycle) => {
      const { startDate, endDate } = deriveLegacyCycleDates(cycle.cycleName);
      return {
        key: `legacy-${cycle.cycleName}`,
        cycleName: cycle.cycleName,
        startDate,
        endDate,
        isLegacy: true,
      };
    }),
  ];

  return rows.sort((a, b) => {
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return b.endDate.localeCompare(a.endDate);
  });
}

export interface LegacyTeamGroup {
  id: string;
  parBusinessUnit: string;
  parDepartment: string;
  parTeam: string;
  parSubTeam: string;
  parLeadEmail: string;
  employeeParCompletion: string;
  leadFeedbackCompletion: string;
  numberOf5pSlots: number;
  numberOf20pSlots: number;
  participants: ParLegacyHistory[];
}

// Ports HistoryPanel.tsx's own groupLegacyParticipantsByTeam: legacy data has
// no real team concept (par_team is always null — there was never a team
// table for it), but every row does carry a real department and lead, so
// grouping on that pair is the finest-grained real split legacy data
// actually supports. Grouping by "team" instead (as real cycles do) would
// collapse every lead in a department into one row, since they'd all share
// the same "Unassigned" team value.
export function groupLegacyParticipantsByTeam(participants: ParLegacyHistory[]): LegacyTeamGroup[] {
  const groups = new Map<string, ParLegacyHistory[]>();
  participants.forEach((record) => {
    const department = record.department ?? "Unassigned";
    const leadName = record.reviewerName ?? "Unassigned";
    const groupKey = `${department}||${leadName}`;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(groupKey, [record]);
    }
  });

  return Array.from(groups.entries())
    .map(([groupKey, members]) => {
      const first = members[0];
      // ParLegacyRecordDetail renders migrated Employee PAR content from
      // questionAnswers[].employeeAnswer, with overallCommentEmployee only
      // as its own fallback for older records that never got question-level
      // data — this count must recognize the same content or a record can
      // show real Employee PAR content once opened while counting here as
      // not done. employeeHasQuestionAnswer is the server-computed version
      // of that same per-question check (not a client-side
      // parseLegacyQuestionAnswers(m.questionAnswers) parse) -- this list is
      // fetched in summary mode, where the full questionAnswers JSON is
      // deliberately null, so the per-question half of this check has to
      // come from the server instead.
      const employeeParDone = members.filter(
        (m) => m.employeeHasQuestionAnswer || hasLegacyContent(m.overallCommentEmployee),
      ).length;
      const leadFeedbackDone = members.filter((m) => hasLegacyContent(m.overallCommentManager)).length;
      return {
        id: groupKey,
        parBusinessUnit: first.businessUnit ?? "-",
        parDepartment: first.department ?? "-",
        parTeam: first.team ?? "Unassigned",
        parSubTeam: first.subTeam ?? "-",
        parLeadEmail: first.reviewerName ?? "-",
        employeeParCompletion: `${employeeParDone}/${members.length}`,
        leadFeedbackCompletion: `${leadFeedbackDone}/${members.length}`,
        // overallSpecialRating is always null on migrated rows (the old
        // system never populated it) -- the real signal is derived from
        // managerScoreCode via resolveLegacyRating, same resolver the
        // detail view uses. 2021 H1 is the one cycle whose special rating
        // depends on questionAnswers, which this summary-mode list doesn't
        // carry -- passing [] here means that cycle's slots correctly read
        // as 0 rather than silently miscounting them.
        numberOf5pSlots: members.filter(
          (m) => resolveLegacyRating(formatLegacyCycleName(m.cycleName), m.managerScoreCode, []).special === "TOP5P",
        ).length,
        numberOf20pSlots: members.filter(
          (m) => resolveLegacyRating(formatLegacyCycleName(m.cycleName), m.managerScoreCode, []).special === "TOP20P",
        ).length,
        participants: members,
      };
    })
    .sort((a, b) => a.parDepartment.localeCompare(b.parDepartment) || a.parLeadEmail.localeCompare(b.parLeadEmail));
}
