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

import CommonPage from "@layout/pages/CommonPage";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { EmployeeStatus } from "@/types/types";
import EmployeeReportTable from "./EmployeeReportTable";

export default function ActiveEmployeesReportView() {
  return (
    <CommonPage
      title="Active Employees"
      icon={<AssessmentIcon />}
      commonPageTabs={[]}
      page={
        <EmployeeReportTable
          employeeStatus={EmployeeStatus.Active}
          showFilterDrawer
          showIncludeMarkedLeaversFilter
          previewAlertText={
            <>
              Showing a preview of the first 10 active employees. <br />
              Export CSV to download the complete dataset with all fields.
            </>
          }
          countChipLabel="Total Active"
          downloadFilename={`active-employees_${new Date().toISOString().slice(0, 10)}.csv`}
        />
      }
    />
  );
}
