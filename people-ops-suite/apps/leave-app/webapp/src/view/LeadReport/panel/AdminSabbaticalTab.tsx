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

import { CircularProgress, Stack } from "@mui/material";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { useEffect, useRef, useState } from "react";

import Title from "@root/src/component/common/Title";
import { PAGE_MAX_WIDTH } from "@root/src/config/ui";
import { formatDateForApi } from "@root/src/services/leaveService";
import { Privileges } from "@root/src/slices/authSlice/auth";
import {
  fetchLeaveHistory,
  resetLeaveState,
  selectLeaveState,
  selectLeaves,
} from "@root/src/slices/leaveSlice/leave";
import { useAppDispatch, useAppSelector } from "@root/src/slices/store";
import { selectUser } from "@root/src/slices/userSlice/user";
import { LeaveType, State, Status } from "@root/src/types/types";
import Toolbar from "@root/src/view/LeadReport/component/Toolbar";
import ApprovalHistoryTable from "@root/src/view/SabbaticalLeave/component/ApprovalHistoryTable";

export default function AdminSabbaticalTab() {
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector(selectUser);
  const leaveState = useAppSelector(selectLeaveState);
  const leaves = useAppSelector(selectLeaves);
  const loading = leaveState === State.loading;
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs().startOf("year"));
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [selectedEmail, setSelectedEmail] = useState<string>("");

  const isPeopleOpsTeam = userInfo?.privileges.includes(Privileges.PEOPLE_OPS_TEAM);

  const handleFetchReport = () => {
    if (userInfo?.workEmail && startDate && endDate) {
      dispatch(resetLeaveState());
      dispatch(
        fetchLeaveHistory({
          leaveCategory: [LeaveType.SABBATICAL],
          statuses: [Status.PENDING, Status.APPROVED, Status.REJECTED, Status.CANCELLED],
          startDate: formatDateForApi(startDate),
          endDate: formatDateForApi(endDate),
          ...(showAllEmployees ? {} : { approverEmail: userInfo.workEmail }),
          ...(selectedEmail ? { email: selectedEmail } : {}),
        }),
      );
    }
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
  }, [showAllEmployees, selectedEmail]);

  return (
    <Stack gap="2rem" flexDirection="column" maxWidth={PAGE_MAX_WIDTH} mx="auto">
      <Title firstWord="Sabbatical" secondWord="Leave Report" />
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
      />
      {loading ? (
        <Stack alignItems="center" justifyContent="center" minHeight="200px">
          <CircularProgress size={30} />
        </Stack>
      ) : (
        <ApprovalHistoryTable rows={leaves} />
      )}
    </Stack>
  );
}
