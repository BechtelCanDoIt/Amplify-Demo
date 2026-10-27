/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { useNotifications } from "@context/notifications/NotificationsContext";
import { EmployeeOption } from "./EmployeeOption";
import LeaveDateField from "./LeaveDateField";
import SabbaticalHistoryTable from "./SabbaticalTable";
import { useLeaveEmployees, useLeaveUserInfo, useLeaves } from "../api/useLeaveData";
import { employeeDisplayName } from "../util/employeeName";
import { REPORT_VALIDATION_MESSAGE } from "../util/leaveCopy";
import { startOfYearIso, todayIso } from "../util/leaveDates";
import { useLeaveGate } from "../api/useLeaveGate";
import { withLoadingAdornment } from "@components/picker-loading/pickerLoading";

// Sabbatical report — AdminSabbaticalTab.tsx.
//
// It shares AdminSabbaticalTab's two differences from the general report: all
// four statuses rather than approved only, and no employee-status filter (the
// source never passes onEmployeeStatusesChange here, so Toolbar.tsx:265 hides
// that control).
// `isPeopleOps` was passed down while this was a tab of one page. It is now a
// route of its own, so it reads the gate directly — one less thing a caller can
// wire up wrongly, and the same source of truth the route is guarded by.
export default function SabbaticalReportTab() {
  const { isPeopleOps, isLead, canReportAllSabbatical: canSeeEveryone } = useLeaveGate();
  // Narrowing to "my team" only means something to someone who has one.
  const canNarrowToTeam = canSeeEveryone && (isLead || isPeopleOps);
  const userInfo = useLeaveUserInfo();
  const employees = useLeaveEmployees(canSeeEveryone);
  const { showError } = useNotifications();

  const workEmail = userInfo.data?.workEmail ?? undefined;

  const [fromDate, setFromDate] = useState(startOfYearIso(new Date().getFullYear()));
  const [toDate, setToDate] = useState(todayIso());
  // Anyone who may see everyone (People Ops or the sabbatical report role)
  // starts there; a plain lead is always scoped to their own reports and never
  // sees the toggle.
  const [showAllEmployees, setShowAllEmployees] = useState(canSeeEveryone);
  const [employee, setEmployee] = useState<string | null>(null);

  const [applied, setApplied] = useState({
    from: fromDate,
    to: toDate,
    email: null as string | null,
    showAllEmployees: canSeeEveryone,
  });

  const byEmail = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.workEmail, e])),
    [employees.data],
  );

  // :52-66. approverEmail scopes to the caller's own reports; People Ops drop it
  // when they ask for everyone.
  const report = useLeaves(
    {
      leaveCategory: ["sabbatical"],
      statuses: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      startDate: applied.from,
      endDate: applied.to,
      ...(applied.showAllEmployees ? {} : { approverEmail: workEmail }),
      ...(applied.email ? { email: applied.email } : {}),
    },
    Boolean(workEmail),
  );

  // Toolbar.tsx:95-107 — the same two checks the general report makes.
  const runReport = () => {
    if (!fromDate || !toDate) {
      showError(REPORT_VALIDATION_MESSAGE.datesRequired);
      return;
    }
    if (toDate < fromDate) {
      showError(REPORT_VALIDATION_MESSAGE.endBeforeStart);
      return;
    }
    setApplied({ from: fromDate, to: toDate, email: employee, showAllEmployees });
  };

  // The scope switch and the employee picker reload on their own. Only their
  // own field is applied; the dates still wait for Fetch.
  const flipScope = (next: boolean) => {
    setShowAllEmployees(next);
    setApplied((prev) => ({ ...prev, showAllEmployees: next }));
  };
  const pickEmployee = (next: string | null) => {
    setEmployee(next);
    setApplied((prev) => ({ ...prev, email: next }));
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr auto" },
            gap: 1.5,
            alignItems: "end",
          }}
        >
          <LeaveDateField label="From" value={fromDate} onChange={setFromDate} />
          <LeaveDateField label="To" value={toDate} min={fromDate} onChange={setToDate} />
          <Button
            variant="contained"
            onClick={runReport}
            disabled={report.isFetching}
            sx={{ fontWeight: 600 }}
          >
            {report.isFetching ? "Loading…" : "Fetch report"}
          </Button>
        </Box>

        {/* Only for those who may see everyone. */}
        {canSeeEveryone && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 1.5 }}>
            {canNarrowToTeam && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={!showAllEmployees}
                    onChange={(e) => flipScope(!e.target.checked)}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, fontWeight: showAllEmployees ? 400 : 600 }}>
                    Subordinates only
                  </Typography>
                }
              />
            )}
            <Box sx={{ minWidth: 260 }}>
              <Autocomplete
                size="small"
                options={(employees.data ?? []).map((e) => e.workEmail)}
                value={employee}
                onChange={(_e, v) => pickEmployee(v)}
                loading={employees.isLoading}
                disabled={employees.isLoading}
                getOptionLabel={(option) => {
                  const person = byEmail.get(option);
                  return person ? employeeDisplayName(person) : option;
                }}
                renderOption={(props, option) => {
                  const person = byEmail.get(option);
                  return person ? (
                    <EmployeeOption key={option} employee={person} props={props} showStatus />
                  ) : (
                    <li {...props} key={option}>
                      {option}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...withLoadingAdornment(params, employees.isLoading)} placeholder="All employees" />
                )}
              />
            </Box>
          </Box>
        )}
      </Card>

      <SabbaticalHistoryTable
        rows={report.data?.leaves ?? []}
        isLoading={report.isLoading}
        error={report.isError ? (report.error as Error) : null}
        emptyMessage="No sabbatical leave in this period."
        showLeaveType
      />
    </Box>
  );
}
