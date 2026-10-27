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

import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import PregnantWomanIcon from "@mui/icons-material/PregnantWoman";
import UndoIcon from "@mui/icons-material/Undo";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { SvgIconComponent } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useRef, useState } from "react";

import Title from "@root/src/component/common/Title";
import LeaveSelectionIcon from "@root/src/view/GeneralLeave/component/LeaveSelectionIcon";
import { PAGE_MAX_WIDTH } from "@root/src/config/ui";
import { useConfirmationModalContext } from "@root/src/context/DialogContext";
import {
  cancelLeaveRequest,
  previewLeaveOnBehalf,
  recordLeaveOnBehalf,
} from "@root/src/services/leaveService";
import { selectAppConfig } from "@root/src/slices/configSlice/config";
import { fetchEmployees, selectEmployees, selectEmployeeState } from "@root/src/slices/employeeSlice/employee";
import { useAppDispatch, useAppSelector } from "@root/src/slices/store";
import {
  ConfirmationType,
  LeaveType,
  OnBehalfLeavePreview,
  PeriodType,
  State,
} from "@root/src/types/types";

const DATE_FORMAT = "YYYY-MM-DD";
// The preview hits the backend, which in turn calls the HR and holiday
// services; debounce so typing a date does not fire a request per keystroke.
const PREVIEW_DEBOUNCE_MS = 400;

// Icons for the recordable types, reusing the same glyphs the General Apply
// screen uses so a type looks the same wherever it appears.
const LEAVE_TYPE_ICONS: Partial<Record<LeaveType, SvgIconComponent>> = {
  [LeaveType.NO_PAY]: MoneyOffIcon,
  [LeaveType.MATERNITY]: PregnantWomanIcon,
  [LeaveType.PATERNITY]: FamilyRestroomIcon,
  [LeaveType.MEDICAL]: LocalHospitalIcon,
  [LeaveType.SABBATICAL]: BeachAccessIcon,
};

// Display labels for the recordable types. Falls back to the raw value so a
// newly configured type still renders something sensible.
const LEAVE_TYPE_LABELS: Partial<Record<LeaveType, string>> = {
  [LeaveType.NO_PAY]: "No-Pay",
  [LeaveType.MEDICAL]: "Medical",
  [LeaveType.MATERNITY]: "Maternity",
  [LeaveType.PATERNITY]: "Paternity",
  [LeaveType.SABBATICAL]: "Sabbatical",
};

// Mirrors the app's own rule (GeneralLeave.tsx:196 via LeaveDateSelection.tsx:62):
// the period type comes from the INCLUSIVE CALENDAR SPAN, not the working-day
// count, so a same-day leave is "one". The backend derives this too; sending it
// keeps the request honest.
const derivePeriodType = (from: Dayjs, to: Dayjs): PeriodType =>
  from.isSame(to, "day") ? PeriodType.ONE : PeriodType.MULTIPLE;

interface EmployeeOption {
  label: string;
  displayName: string;
  email: string;
  thumbnail: string | null;
  employeeStatus?: string | null;
}

interface RecordedLeave {
  id: number;
  employeeName: string;
  employeeEmail: string;
  startDate: string;
  endDate: string;
  workingDays: number;
}

export default function RecordEmployeeLeave() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { showConfirmation } = useConfirmationModalContext();

  const employees = useAppSelector(selectEmployees);
  const employeesLoading = useAppSelector(selectEmployeeState) === State.loading;
  const appConfig = useAppSelector(selectAppConfig);

  // Which leave types may be recorded is server configuration
  // (onBehalfAllowedLeaveTypes), so adding a type never needs a UI change.
  const allowedLeaveTypes = useMemo<LeaveType[]>(
    () => appConfig?.onBehalfAllowedLeaveTypes ?? [LeaveType.NO_PAY],
    [appConfig],
  );
  const [leaveType, setLeaveType] = useState<LeaveType>(allowedLeaveTypes[0]);

  useEffect(() => {
    if (!allowedLeaveTypes.includes(leaveType)) {
      setLeaveType(allowedLeaveTypes[0]);
    }
  }, [allowedLeaveTypes]);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [reason, setReason] = useState("");

  const [preview, setPreview] = useState<OnBehalfLeavePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recorded, setRecorded] = useState<RecordedLeave | null>(null);

  const previewAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (employees.length === 0) {
      dispatch(fetchEmployees());
    }
  }, []);

  const employeeOptions: EmployeeOption[] = useMemo(
    () =>
      employees.map((emp) => ({
        label: `${emp.firstName} ${emp.lastName} (${emp.workEmail})`,
        displayName: `${emp.firstName} ${emp.lastName}`.trim(),
        email: emp.workEmail,
        thumbnail: emp.employeeThumbnail ?? null,
        employeeStatus: emp.employeeStatus,
      })),
    [employees],
  );

  // Live working-day preview. Also surfaces overlaps before the admin submits,
  // rather than as an error afterwards.
  useEffect(() => {
    previewAbort.current?.abort();
    setPreviewError(null);

    // The abort above skips the `finally` that would clear this, so an in-flight
    // preview would otherwise leave the spinner up - and the spinner hides the
    // validation error below it.
    setPreviewLoading(false);

    if (!selectedEmployee || !startDate || !endDate) {
      setPreview(null);
      return;
    }
    if (endDate.isBefore(startDate, "day")) {
      setPreview(null);
      setPreviewError("End date cannot be before the start date.");
      return;
    }

    const controller = new AbortController();
    previewAbort.current = controller;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewLeaveOnBehalf(
          {
            employeeEmail: selectedEmployee.email,
            leaveType,
            startDate: startDate.format(DATE_FORMAT),
            endDate: endDate.format(DATE_FORMAT),
            periodType: derivePeriodType(startDate, endDate),
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setPreview(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPreview(null);
          setPreviewError("Could not calculate the leave days. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedEmployee, startDate, endDate, leaveType]);

  const canSubmit =
    !!selectedEmployee &&
    !!startDate &&
    !!endDate &&
    reason.trim().length > 0 &&
    !!preview &&
    !preview.hasOverlap &&
    preview.workingDays > 0 &&
    !previewLoading &&
    !submitting;

  const resetForm = () => {
    setSelectedEmployee(null);
    setStartDate(null);
    setEndDate(null);
    setReason("");
    setPreview(null);
    setPreviewError(null);
  };

  const submit = async () => {
    if (!selectedEmployee || !startDate || !endDate || !preview) return;
    setSubmitting(true);
    try {
      await recordLeaveOnBehalf({
        employeeEmail: selectedEmployee.email,
        leaveType,
        startDate: startDate.format(DATE_FORMAT),
        endDate: endDate.format(DATE_FORMAT),
        periodType: derivePeriodType(startDate, endDate),
        comment: reason.trim(),
        isPublicComment: true,
      });
      enqueueSnackbar(`${LEAVE_TYPE_LABELS[leaveType] ?? leaveType} leave recorded for ${selectedEmployee.displayName}.`, {
        variant: "success",
      });
      setRecorded({
        // The backend does not return the new id yet; undo is offered only when
        // it does. Kept at -1 so the banner still summarises what was recorded.
        id: -1,
        employeeName: selectedEmployee.displayName,
        employeeEmail: selectedEmployee.email,
        startDate: startDate.format(DATE_FORMAT),
        endDate: endDate.format(DATE_FORMAT),
        workingDays: preview.workingDays,
      });
      resetForm();
    } catch (error) {
      enqueueSnackbar("Could not record the leave. Please try again.", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAndSubmit = () => {
    if (!selectedEmployee || !startDate || !endDate || !preview) return;
    showConfirmation(
      `Record this ${LEAVE_TYPE_LABELS[leaveType] ?? leaveType} leave?`,
      <Stack gap={1.2}>
        <Typography variant="body2">
          {selectedEmployee.displayName} will be emailed and the absence added to the shared
          calendar.
        </Typography>
        <Divider />
        <Stack direction="row" gap={1}>
          <Typography variant="body2" color="text.secondary" width={110}>
            Employee
          </Typography>
          <Typography variant="body2">{selectedEmployee.email}</Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          <Typography variant="body2" color="text.secondary" width={110}>
            Period
          </Typography>
          <Typography variant="body2">
            {startDate.format("ddd, D MMM YYYY")} &ndash; {endDate.format("ddd, D MMM YYYY")}
          </Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          <Typography variant="body2" color="text.secondary" width={110}>
            Working days
          </Typography>
          <Typography variant="body2" fontWeight={600} color="primary.main">
            {preview.workingDays}
          </Typography>
        </Stack>
      </Stack>,
      ConfirmationType.send,
      submit,
      "Yes, record it",
      "Go back",
    );
  };

  const undo = async () => {
    if (!recorded || recorded.id < 0) return;
    try {
      await cancelLeaveRequest(recorded.id);
      enqueueSnackbar("The recorded leave was removed.", { variant: "success" });
      setRecorded(null);
    } catch (error) {
      enqueueSnackbar("Could not undo the record.", { variant: "error" });
    }
  };

  return (
    <Stack gap="1.5rem" maxWidth={PAGE_MAX_WIDTH} mx="auto">
      <Title firstWord="Record" secondWord="Employee Leave" />

      {recorded && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon />}
          action={
            recorded.id > 0 ? (
              <Button color="inherit" size="small" startIcon={<UndoIcon />} onClick={undo}>
                Undo
              </Button>
            ) : undefined
          }
          onClose={() => setRecorded(null)}
        >
          <Typography variant="body2" fontWeight={600}>
            Leave recorded for {recorded.employeeName}
          </Typography>
          <Typography variant="caption">
            {recorded.startDate} to {recorded.endDate} &middot; {recorded.workingDays} working days
          </Typography>
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} gap="1.5rem" alignItems="flex-start">
        <Paper variant="outlined" sx={{ flex: 1, p: "1.5rem", borderRadius: 2, width: "100%" }}>
          <Stack gap="1.25rem">
            <Stack direction="row" alignItems="center" gap={1}>
              <CategoryRoundedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p1.active }}>
                Leave Type
              </Typography>
            </Stack>
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fill, minmax(5rem, 1fr))"
              gap={1.5}
              width="100%"
            >
              {allowedLeaveTypes.map((type) => (
                <Box key={type}>
                  <LeaveSelectionIcon
                    Icon={LEAVE_TYPE_ICONS[type] ?? EventBusyIcon}
                    label={LEAVE_TYPE_LABELS[type] ?? type}
                    isSelected={leaveType === type}
                    onClick={() => setLeaveType(type)}
                  />
                </Box>
              ))}
            </Box>

            <Autocomplete
              options={employeeOptions}
              value={selectedEmployee}
              onChange={(_, value) => setSelectedEmployee(value)}
              loading={employeesLoading}
              isOptionEqualToValue={(option, value) => option.email === value.email}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.email} sx={{ gap: 1.5 }}>
                  <Avatar src={option.thumbnail ?? undefined} sx={{ width: 32, height: 32 }}>
                    {option.displayName.charAt(0)}
                  </Avatar>
                  <Stack>
                    <Typography variant="body2" noWrap>
                      {option.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {option.email}
                    </Typography>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Employee"
                  size="small"
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {employeesLoading ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />

            <Stack direction={{ xs: "column", sm: "row" }} gap="1rem">
              <DatePicker
                label="From"
                value={startDate}
                onChange={setStartDate}
                format={DATE_FORMAT}
                disabled={!selectedEmployee}
                sx={{ flex: 1 }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
              <DatePicker
                label="To"
                value={endDate}
                onChange={setEndDate}
                format={DATE_FORMAT}
                minDate={startDate ?? undefined}
                disabled={!selectedEmployee}
                sx={{ flex: 1 }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Stack>

            {/* Live preview: the working-day count is not obvious from two
                dates, so it is shown before the admin commits. */}
            {previewLoading && (
              <Stack direction="row" gap={1.5} alignItems="center" p="1rem">
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Calculating working days&hellip;
                </Typography>
              </Stack>
            )}

            {!previewLoading && previewError && <Alert severity="error">{previewError}</Alert>}

            {!previewLoading && !previewError && preview && preview.hasOverlap && (
              <Alert severity="warning" icon={<WarningAmberIcon />}>
                <Typography variant="body2" fontWeight={600}>
                  This overlaps leave already recorded for {selectedEmployee?.displayName}
                </Typography>
                <Typography variant="caption">
                  Recording it would double-count these days. Adjust the dates, or cancel the
                  existing leave first.
                </Typography>
              </Alert>
            )}

            {!previewLoading && !previewError && preview && !preview.hasOverlap && (
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: "1.125rem 1.25rem",
                  bgcolor: "action.hover",
                }}
              >
                {preview.workingDays > 0 ? (
                  <>
                    <Stack direction="row" alignItems="baseline" gap={1}>
                      <Typography variant="h4" fontWeight={600} color="primary.main">
                        {preview.workingDays}
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        working days
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Weekends and company holidays in this range are excluded.
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {preview.message ?? "This range contains no working days."}
                  </Typography>
                )}
              </Box>
            )}

            {!preview && !previewLoading && !previewError && (
              <Box
                sx={{
                  border: `1px dashed ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: "1.75rem 1.25rem",
                  textAlign: "center",
                }}
              >
                <CalendarMonthIcon sx={{ color: "text.disabled" }} />
                <Typography variant="body2" color="text.disabled">
                  Pick an employee and a date range
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  The working-day count appears here, with weekends and company holidays removed
                </Typography>
              </Box>
            )}

            <TextField
              label="Reason"
              required
              multiline
              minRows={3}
              size="small"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={!selectedEmployee}
              helperText="Visible to the employee in the notification."
            />

            <Divider />

            <Stack direction="row" justifyContent="flex-end" gap="0.75rem">
              <Button color="inherit" onClick={resetForm} disabled={submitting}>
                Clear
              </Button>
              <Button
                variant="contained"
                onClick={confirmAndSubmit}
                disabled={!canSubmit}
                sx={{ px: "3rem", py: "0.5rem" }}
              >
                {submitting ? <CircularProgress size={20} color="inherit" /> : "Record Leave"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ width: { xs: "100%", md: 344 }, flexShrink: 0, p: "1.25rem", borderRadius: 2 }}
        >
          <Typography variant="h6">About recording leave</Typography>
          <Divider sx={{ my: "1rem" }} />
          <Stack gap={1.25}>
            <Typography variant="caption" color="text.secondary">
              An admin records leave for another employee when the leave type cannot be requested in
              the app, or when the employee was not able to apply for it themselves.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              The day count excludes weekends and company holidays for the employee&rsquo;s
              location, using the same calculation as any other leave.
            </Typography>
            <Divider />
            <Stack direction="row" gap={1.25} alignItems="flex-start">
              <MailOutlineIcon sx={{ fontSize: 16, color: "text.secondary", mt: "2px" }} />
              <Typography variant="caption" color="text.secondary">
                The employee, their lead and the leave group will be notified
              </Typography>
            </Stack>
            <Stack direction="row" gap={1.25} alignItems="flex-start">
              <CalendarMonthIcon sx={{ fontSize: 16, color: "text.secondary", mt: "2px" }} />
              <Typography variant="caption" color="text.secondary">
                A calendar event will be created for the period
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  );
}
