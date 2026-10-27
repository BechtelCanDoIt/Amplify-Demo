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

import type { ParAdditionalReport } from "../api/types";

// Ports EmployeeReportView.tsx's own getFilteredRows: the endpoint returns
// both direct and indirect reports, and this tab only shows the indirect
// ones (direct reports already have their own tab). Search matches the
// email only, not the name — that's source's own narrower scope here, not
// an oversight ported by accident.
export function filterAdditionalReports(rows: ParAdditionalReport[], searchQuery: string): ParAdditionalReport[] {
  const term = searchQuery.toLowerCase();
  return rows
    .filter((row) => row.parEmployeeEmail.toLowerCase().includes(term))
    .filter((row) => row.reportingType.toLowerCase() === "indirect");
}
