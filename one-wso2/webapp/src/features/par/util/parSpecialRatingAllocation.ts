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

import type { ParSpecialRatingAllocation } from "../api/types";

export interface ParSpecialRatingAllocationGroup {
  quotaId: number;
  quotaName: string;
  top5Quota: number;
  top20Quota: number;
  departments: (ParSpecialRatingAllocation & { highlight: boolean })[];
}

// Ports SpecialRatingAllocationView.tsx's own processedGroupedData: groups
// flat allocation rows by parQuotaId (a quota can span several BU/department/
// team combinations), and flags each row for highlighting when the search
// term matches its business unit, department, team, or all three combined.
export function groupSpecialRatingAllocations(
  rows: ParSpecialRatingAllocation[],
  searchQuery: string,
): ParSpecialRatingAllocationGroup[] {
  const groups = new Map<number, ParSpecialRatingAllocationGroup>();
  const searchTerm = searchQuery.toLowerCase().trim();

  for (const row of rows) {
    const combinedText = `${row.parBusinessUnit} ${row.parDepartment} ${row.parTeam}`.toLowerCase();
    const highlight = Boolean(
      searchTerm &&
        (row.parBusinessUnit.toLowerCase().includes(searchTerm) ||
          row.parDepartment.toLowerCase().includes(searchTerm) ||
          row.parTeam.toLowerCase().includes(searchTerm) ||
          combinedText.includes(searchTerm)),
    );

    if (!groups.has(row.parQuotaId)) {
      groups.set(row.parQuotaId, {
        quotaId: row.parQuotaId,
        quotaName: row.parSpecialQuotaName,
        top5Quota: row.parTop5Quota,
        top20Quota: row.parTop20Quota,
        departments: [],
      });
    }
    groups.get(row.parQuotaId)!.departments.push({ ...row, highlight });
  }

  return Array.from(groups.values());
}
