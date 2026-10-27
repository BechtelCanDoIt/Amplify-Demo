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

import type { ParChainReport } from "../api/types";

// `isEmployeeALead` is a literal "True"/"False" string from the backend, not
// a boolean. Source itself compares it two different ways in two places
// (getFilteredRows does `.toLowerCase() === "true"`, the "View Subordinates"
// action gate does an exact `=== "True"`) — reproducing that split here
// would let the "Show Leads Only" filter and the action disagree on the
// same row the moment the backend's casing ever changes. One shared,
// case-insensitive predicate avoids that.
export function isEmployeeALead(row: ParChainReport): boolean {
  return row.isEmployeeALead.toLowerCase() === "true";
}

// Ports ReportChainView.tsx's own getFilteredRows: search matches the email
// only (not the name, same narrower scope as Additional Reports), combined
// with the "Show Leads Only" toggle.
export function filterChainReports(
  rows: ParChainReport[],
  searchQuery: string,
  showLeadsOnly: boolean,
): ParChainReport[] {
  const term = searchQuery.toLowerCase();
  return rows.filter(
    (row) => row.parEmployeeEmail.toLowerCase().includes(term) && (!showLeadsOnly || isEmployeeALead(row)),
  );
}
