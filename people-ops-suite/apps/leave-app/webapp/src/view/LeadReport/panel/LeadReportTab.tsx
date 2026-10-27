// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import { Stack } from "@mui/material";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { useEffect, useRef, useState } from "react";

import Title from "@root/src/component/common/Title";
import { PAGE_MAX_WIDTH } from "@root/src/config/ui";
import { formatDateForApi } from "@root/src/services/leaveService";
import { Privileges } from "@root/src/slices/authSlice/auth";
import { fetchLeaveHistory, selectLeaves, selectLeaveState } from "@root/src/slices/leaveSlice/leave";
import { useAppDispatch, useAppSelector } from "@root/src/slices/store";
import { selectUser } from "@root/src/slices/userSlice/user";
import { EmployeeStatus, State, Status } from "@root/src/types/types";

import LeadReportTable from "../component/LeadReportTable";
import Toolbar from "../component/Toolbar";

export default function LeadReportTab() {
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector(selectUser);
  const records = useAppSelector(selectLeaves);
  const leaveState = useAppSelector(selectLeaveState);
  const loading = leaveState === State.loading;

  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf("year"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([EmployeeStatus.ACTIVE, EmployeeStatus.MARKED_LEAVER]);

  const pendingFetch = useRef<{ abort: () => void } | null>(null);

  const isPeopleOpsTeam = userInfo?.privileges.includes(Privileges.PEOPLE_OPS_TEAM);

  const handleFetchReport = () => {
    if (!startDate || !endDate) return;
    pendingFetch.current?.abort();
    pendingFetch.current = dispatch(fetchLeaveHistory({
      startDate: formatDateForApi(startDate),
      endDate: formatDateForApi(endDate),
      ...(showAllEmployees ? {} : { approverEmail: userInfo?.workEmail }),
      ...(selectedEmail ? { email: selectedEmail } : {}),
      statuses: [Status.APPROVED],
      ...(employeeStatuses.length > 0 ? { employeeStatuses } : {}),
    }));
  };

  useEffect(() => {
    if (isPeopleOpsTeam) setShowAllEmployees(true);
    else handleFetchReport();
  }, []);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    handleFetchReport();
  }, [showAllEmployees, selectedEmail, employeeStatuses]);

  return (
    <Stack gap="1.5rem" maxWidth={PAGE_MAX_WIDTH} mx="auto">
      <Title firstWord="General" secondWord="Leave Report" />
      <Toolbar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onFetchReport={handleFetchReport}
        loading={loading}
        showToggle={isPeopleOpsTeam}
        toggleChecked={showAllEmployees}
        onToggleChange={setShowAllEmployees}
        selectedEmail={selectedEmail}
        onEmailChange={setSelectedEmail}
        employeeStatuses={employeeStatuses}
        onEmployeeStatusesChange={setEmployeeStatuses}
      />
      <LeadReportTable rows={records} loading={loading} />
    </Stack>
  );
}
