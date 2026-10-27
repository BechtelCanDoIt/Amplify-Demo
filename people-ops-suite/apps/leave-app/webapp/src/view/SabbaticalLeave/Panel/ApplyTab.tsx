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
import {
  Alert,
  AlertTitle,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useSnackbar } from "notistack";

import { useEffect, useState } from "react";

import CustomButton from "@root/src/component/common/CustomButton";
import { FormContainer } from "@root/src/component/common/FormContainer";
import Title from "@root/src/component/common/Title";
import { PAGE_MAX_WIDTH } from "@root/src/config/ui";
import { useConfirmationModalContext } from "@root/src/context/DialogContext";
import {
  fetchLeaveHistory,
  resetLeaveState,
  selectLeaveState,
  selectLeaves,
  selectSubmitState,
  submitLeave,
} from "@root/src/slices/leaveSlice/leave";
import { useAppDispatch, useAppSelector } from "@root/src/slices/store";
import { selectUser } from "@root/src/slices/userSlice/user";
import {
  ConfirmationType,
  EligibilityResponse,
  LeaveType,
  OrderBy,
  State,
  Status,
} from "@root/src/types/types";

interface ApplyTabProps {
  sabbaticalPolicyUrl: string;
  sabbaticalUserGuideUrl: string;
  sabbaticalLeaveEligibilityDuration: number;
  sabbaticalLeaveMaxApplicationDuration: number;
  sabbaticalLeaveMinJobBand: number;
}

dayjs.extend(utc);

export default function ApplyTab({
  sabbaticalPolicyUrl,
  sabbaticalUserGuideUrl,
  sabbaticalLeaveEligibilityDuration,
  sabbaticalLeaveMaxApplicationDuration,
  sabbaticalLeaveMinJobBand,
}: ApplyTabProps) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { showConfirmation } = useConfirmationModalContext();
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector(selectUser);
  const leaveState = useAppSelector(selectLeaveState);
  const leaves = useAppSelector(selectLeaves);
  const submitState = useAppSelector(selectSubmitState);
  const [eligibilityPayload, setEligibilityPayload] = useState<EligibilityResponse>({
    employmentStartDate: "",
    lastSabbaticalLeaveEndDate: dayjs().toISOString(),
  });
  const [sabbaticalEndDateFieldEditable, setSabbaticalEndDateFieldEditable] = useState(false);
  const [lastSabbaticalLeaveEndDate, setLastSabbaticalLeaveEndDate] = useState<Dayjs | null>(null);
  const [leaveStartDate, setLeaveStartDate] = useState<Dayjs | null>(null);
  const [leaveEndDate, setLeaveEndDate] = useState<Dayjs | null>(null);
  const [additionalComment, setAdditionalComment] = useState<string>("");
  const [managerApprovalChecked, setManagerApprovalChecked] = useState(false);
  const [policyReadChecked, setPolicyReadChecked] = useState(false);
  const [resignationAcknowledgeChecked, setResignationAcknowledgeChecked] = useState(false);
  const [handoverAcknowledgeChecked, setHandoverAcknowledgeChecked] = useState(false);
  const [startDateError, setStartDateError] = useState(false);
  const [endDateError, setEndDateError] = useState(false);
  const [durationExceedError, setDurationExceedError] = useState(false);
  const [managerApprovalError, setManagerApprovalError] = useState(false);
  const [policyReadError, setPolicyReadError] = useState(false);
  const [resignationAcknowledgeError, setResignationAcknowledgeError] = useState(false);
  const [handoverAcknowledgeError, setHandoverAcknowledgeError] = useState(false);
  const [sabbaticalEligibilityWarning, setSabbaticalEligibilityWarning] = useState<string>("");
  const [hasFetched, setHasFetched] = useState(false);
  const [sabbaticalEligibilityDurationInYears] = useState(parseFloat((sabbaticalLeaveEligibilityDuration / 365).toFixed(1)));
  const [sabbaticalMaxApplicationDurationInWeeks] = useState(
    sabbaticalLeaveMaxApplicationDuration / 7,
  );

  const isLoading = leaveState === State.loading || !hasFetched;
  const isSubmitting = submitState === State.loading;
  const lastLeaveEndDate = leaves[0]?.endDate;
  const jobBand = userInfo?.jobBand ?? null;
  const isJobBandEligible = jobBand !== null && jobBand >= sabbaticalLeaveMinJobBand;

  // Always fetch leave history — eligibility is validated against leaveStartDate, not today
  useEffect(() => {
    if (userInfo?.workEmail) {
      setHasFetched(false);
      dispatch(resetLeaveState());
      dispatch(
        fetchLeaveHistory({
          email: userInfo.workEmail,
          leaveCategory: [LeaveType.SABBATICAL],
          statuses: [Status.APPROVED],
          orderBy: OrderBy.DESC,
          limit: 1,
        }),
      ).then(() => {
        setHasFetched(true);
      });
    }
  }, [
    dispatch,
    userInfo?.workEmail,
  ]);

  useEffect(() => {
    if (leaveState !== State.success || !hasFetched) {
      return;
    }

    const eligibilityResponse: EligibilityResponse = {
      employmentStartDate: userInfo?.employmentStartDate || "",
      lastSabbaticalLeaveEndDate: lastLeaveEndDate || "",
    };

    setEligibilityPayload(eligibilityResponse);
    setLastSabbaticalLeaveEndDate(lastLeaveEndDate ? dayjs(lastLeaveEndDate) : null);
    if (!lastLeaveEndDate) {
      setSabbaticalEndDateFieldEditable(true);
    }
  }, [
    leaveState,
    leaves,
    hasFetched,
    userInfo?.employmentStartDate,
    lastLeaveEndDate,
  ]);

  // Dynamically validate eligibility gap between anchor date and leave start date
  useEffect(() => {
    // Use last sabbatical end date if available, otherwise fall back to employment start date
    const validationAnchor = lastSabbaticalLeaveEndDate
      ?? (userInfo?.employmentStartDate ? dayjs(userInfo.employmentStartDate) : null);

    if (!validationAnchor || !leaveStartDate) {
      setSabbaticalEligibilityWarning("");
      return;
    }

    const diffDays = leaveStartDate.startOf("day").diff(validationAnchor.startOf("day"), "day");
    if (diffDays < sabbaticalLeaveEligibilityDuration) {
      const anchorLabel = lastSabbaticalLeaveEndDate
        ? "last sabbatical leave end date"
        : "employment start date";
      setSabbaticalEligibilityWarning(
        `The leave start date must be at least ${sabbaticalEligibilityDurationInYears} years after the ${anchorLabel}.`,
      );
    } else {
      setSabbaticalEligibilityWarning("");
    }
  }, [
    lastSabbaticalLeaveEndDate,
    leaveStartDate,
    userInfo?.employmentStartDate,
    sabbaticalLeaveEligibilityDuration,
  ]);

  // Validate leave dates to be stay within eligibility duration
  useEffect(() => {
    if (!leaveStartDate || !leaveEndDate) {
      setEndDateError(false);
      setDurationExceedError(false);
      return;
    }

    const daysDifference = leaveEndDate.diff(leaveStartDate, "day") + 1;
    if (daysDifference > sabbaticalLeaveMaxApplicationDuration) {
      setEndDateError(true);
      setDurationExceedError(true);
    } else {
      setEndDateError(false);
      setDurationExceedError(false);
    }
  }, [leaveStartDate, leaveEndDate, sabbaticalLeaveMaxApplicationDuration]);

  const handleOpenDialog = () => {
    setStartDateError(false);
    setEndDateError(false);
    setDurationExceedError(false);
    setManagerApprovalError(false);
    setPolicyReadError(false);
    setResignationAcknowledgeError(false);
    setHandoverAcknowledgeError(false);

    if (!leaveStartDate) {
      setStartDateError(true);
    }
    if (!leaveEndDate) {
      setEndDateError(true);
    }

    if (!leaveStartDate || !leaveEndDate) {
      enqueueSnackbar("Please select both start and end dates", { variant: "error" });
      return;
    }

    if (leaveEndDate.isBefore(leaveStartDate)) {
      enqueueSnackbar("End date must be after start date", { variant: "error" });
      return;
    }

    const daysDifference = leaveEndDate.diff(leaveStartDate, "day") + 1;
    if (daysDifference > sabbaticalLeaveMaxApplicationDuration) {
      setEndDateError(true);
      setDurationExceedError(true);
      enqueueSnackbar(
        `Sabbatical leave duration should be less than or equal to ${sabbaticalMaxApplicationDurationInWeeks} weeks`,
        {
          variant: "error",
        },
      );
      return;
    }

    // Validate eligibility duration against the leave request start date
    if (sabbaticalEligibilityWarning) {
      enqueueSnackbar(sabbaticalEligibilityWarning, { variant: "error" });
      return;
    }

    if (!managerApprovalChecked) {
      setManagerApprovalError(true);
    }
    if (!policyReadChecked) {
      setPolicyReadError(true);
    }
    if (!resignationAcknowledgeChecked) {
      setResignationAcknowledgeError(true);
    }
    if (!handoverAcknowledgeChecked) {
      setHandoverAcknowledgeError(true);
    }

    if (
      !managerApprovalChecked ||
      !policyReadChecked ||
      !resignationAcknowledgeChecked ||
      !handoverAcknowledgeChecked
    ) {
      enqueueSnackbar("Please acknowledge all the required checkboxes", { variant: "error" });
      return;
    }

    const dateRange = `${leaveStartDate!.format("YYYY-MM-DD")} to ${leaveEndDate!.format("YYYY-MM-DD")}`;
    const leadInfo = userInfo?.leadEmail ? ` to ${userInfo.leadEmail}` : "";
    showConfirmation(
      "Do you want to submit this sabbatical leave?",
      `This will submit your sabbatical leave request for ${dateRange} and send it${leadInfo} for approval.`,
      ConfirmationType.send,
      handleConfirmSubmit,
      "Yes",
      "No",
    );
  };

  const handleConfirmSubmit = async () => {
    // Append last sabbatical leave end date to comment
    const commentWithDate = lastSabbaticalLeaveEndDate
      ? `${additionalComment} **** Last Sabbatical Leave End Date: ${lastSabbaticalLeaveEndDate.format("YYYY-MM-DD")} ****`
      : additionalComment;

    const result = await dispatch(
      submitLeave({
        leaveType: LeaveType.SABBATICAL,
        startDate: leaveStartDate!.format("YYYY-MM-DD"),
        endDate: leaveEndDate!.format("YYYY-MM-DD"),
        comment: commentWithDate,
      }),
    );

    if (submitLeave.fulfilled.match(result)) {
      setLeaveStartDate(null);
      setLeaveEndDate(null);
      setAdditionalComment("");
      setManagerApprovalChecked(false);
      setPolicyReadChecked(false);
      setResignationAcknowledgeChecked(false);
      setHandoverAcknowledgeChecked(false);
    }
  };

  return (
    <>
      {isLoading ? (
        <Stack alignItems="center" justifyContent="center" minHeight="200px">
          <CircularProgress size={30} />
        </Stack>
      ) : (
        <Stack gap="1rem" flexDirection="column" maxWidth={PAGE_MAX_WIDTH} mx="auto">
          <FormContainer>
            <Stack
              direction={{ md: "row" }}
              justifyContent="space-between"
              alignItems="center"
              borderBottom={`1px solid ${theme.palette.divider}`}
              pb="1rem"
            >
              <Title firstWord="Sabbatical" secondWord="Leave Application" borderEnabled={false} />
              <Stack direction="row" gap="1rem" justifyContent="center" alignItems="center">
                <Link
                  href={sabbaticalUserGuideUrl}
                  target="_blank"
                  rel="noopener"
                  underline="hover"
                >
                  User Guide
                </Link>
              </Stack>
            </Stack>
            {!userInfo?.leadEmail ? (
              <Alert variant="outlined" severity="warning">
                <AlertTitle>Reporting lead not set</AlertTitle>
                Sabbatical leave requires a reporting lead for the approval process. Your lead is
                currently not set in the people management system. Please contact the People
                Operations team to update your profile before applying.
              </Alert>
            ) : !isJobBandEligible ? (
              <Alert variant="outlined" severity="warning">
                <AlertTitle>Not eligible for sabbatical leave</AlertTitle>
                {jobBand === null
                  ? "Your job band is not recorded in the people management system. Please contact the " +
                    "People Operations team to apply for sabbatical leave."
                  : `Sabbatical leave is available for job band ${sabbaticalLeaveMinJobBand} and above.`}
              </Alert>
            ) : (
            <>
            <Stack
              flexDirection={{ xs: "column", md: "row" }}
              gap="2rem"
              justifyContent="space-between"
            >
              <DatePicker
                label="Employment Start date"
                sx={{ flex: "1" }}
                value={dayjs(eligibilityPayload?.employmentStartDate)}
                format="YYYY-MM-DD"
                disabled
              />
              <DatePicker
                label="Last sabbatical leave end date"
                sx={{ flex: 1 }}
                value={lastSabbaticalLeaveEndDate ? dayjs(lastSabbaticalLeaveEndDate) : null}
                onChange={(newValue) => setLastSabbaticalLeaveEndDate(newValue)}
                disabled={!sabbaticalEndDateFieldEditable}
                format="YYYY-MM-DD"
                minDate={userInfo?.employmentStartDate ? dayjs(userInfo.employmentStartDate) : undefined}
                {...(sabbaticalEndDateFieldEditable && { disableFuture: true })}
              />
            </Stack>
            {sabbaticalEligibilityWarning && (
              <Alert variant="outlined" severity="warning">
                {sabbaticalEligibilityWarning}
              </Alert>
            )}
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  gap="2rem"
                  justifyContent="space-between"
                >
                  <DatePicker
                    label="Leave request start date*"
                    sx={{ flex: "1" }}
                    value={leaveStartDate}
                    onChange={(newValue) => {
                      setLeaveStartDate(newValue);
                      setStartDateError(false);
                      setDurationExceedError(false);
                      if (newValue && leaveEndDate && newValue.isAfter(leaveEndDate)) {
                        setLeaveEndDate(null);
                      }
                    }}
                    format="YYYY-MM-DD"
                    disablePast
                    slotProps={{
                      textField: {
                        error: startDateError,
                        helperText: startDateError ? "Start date is required" : "",
                      },
                    }}
                  />
                  <DatePicker
                    label="Leave request end date*"
                    sx={{ flex: "1" }}
                    value={leaveEndDate}
                    minDate={leaveStartDate ?? undefined}
                    onChange={(newValue) => {
                      setLeaveEndDate(newValue);
                      setEndDateError(false);
                      setDurationExceedError(false);
                    }}
                    format="YYYY-MM-DD"
                    disablePast
                    slotProps={{
                      textField: {
                        error: endDateError,
                        helperText: endDateError
                          ? durationExceedError
                            ? `Leave duration must not exceed ${sabbaticalMaxApplicationDurationInWeeks} weeks`
                            : "End date is required"
                          : "",
                      },
                    }}
                  />
                </Stack>
                <Stack gap="0.8rem">
                  <Typography sx={{ color: theme.palette.text.primary }}>
                    Additional Comments:
                  </Typography>
                  <TextField
                    label="Add a comment..."
                    multiline
                    minRows={1}
                    fullWidth
                    variant="outlined"
                    value={additionalComment}
                    onChange={(e) => setAdditionalComment(e.target.value)}
                  />
                </Stack>
                <Stack gap="0.5rem">
                  <FormControlLabel
                    control={
                      <Checkbox
                        color={managerApprovalError ? "error" : "primary"}
                        checked={managerApprovalChecked}
                        onChange={(e) => {
                          setManagerApprovalChecked(e.target.checked);
                          setManagerApprovalError(false);
                        }}
                      />
                    }
                    label="I confirm that I have discussed my sabbatical leave plans with my lead and have obtained their approval."
                    sx={{
                      color: managerApprovalError
                        ? theme.palette.error.main
                        : theme.palette.text.primary,
                      "& .MuiFormControlLabel-label": {
                        color: managerApprovalError
                          ? theme.palette.error.main
                          : theme.palette.text.primary,
                        fontSize: theme.typography.body2.fontSize,
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        color={policyReadError ? "error" : "primary"}
                        checked={policyReadChecked}
                        onChange={(e) => {
                          setPolicyReadChecked(e.target.checked);
                          setPolicyReadError(false);
                        }}
                      />
                    }
                    label={
                      <>
                        I have read and understood the terms of the{" "}
                        <Link
                          href={sabbaticalPolicyUrl}
                          target="_blank"
                          rel="noopener"
                          underline="hover"
                        >
                          Sabbatical Leave Policy
                        </Link>
                        .
                      </>
                    }
                    sx={{
                      color: policyReadError
                        ? theme.palette.error.main
                        : theme.palette.text.primary,
                      "& .MuiFormControlLabel-label": {
                        color: policyReadError
                          ? theme.palette.error.main
                          : theme.palette.text.primary,
                        fontSize: theme.typography.body2.fontSize,
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        color={resignationAcknowledgeError ? "error" : "primary"}
                        checked={resignationAcknowledgeChecked}
                        onChange={(e) => {
                          setResignationAcknowledgeChecked(e.target.checked);
                          setResignationAcknowledgeError(false);
                        }}
                      />
                    }
                    label="I acknowledge that I cannot voluntarily resign from my employment for 6 months after completing sabbatical leave. If I do, I will be required to reimburse an amount equivalent to the salary paid to me during the sabbatical period."
                    sx={{
                      color: resignationAcknowledgeError
                        ? theme.palette.error.main
                        : theme.palette.text.primary,
                      "& .MuiFormControlLabel-label": {
                        color: resignationAcknowledgeError
                          ? theme.palette.error.main
                          : theme.palette.text.primary,
                        fontSize: theme.typography.body2.fontSize,
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        color={handoverAcknowledgeError ? "error" : "primary"}
                        checked={handoverAcknowledgeChecked}
                        onChange={(e) => {
                          setHandoverAcknowledgeChecked(e.target.checked);
                          setHandoverAcknowledgeError(false);
                        }}
                      />
                    }
                    label="I acknowledge that sabbatical leave is subject to appropriate planning and handover between myself and my Lead. I am responsible for ensuring that my responsibilities, objectives and work commitments are appropriately managed during my absence."
                    sx={{
                      color: handoverAcknowledgeError
                        ? theme.palette.error.main
                        : theme.palette.text.primary,
                      "& .MuiFormControlLabel-label": {
                        color: handoverAcknowledgeError
                          ? theme.palette.error.main
                          : theme.palette.text.primary,
                        fontSize: theme.typography.body2.fontSize,
                      },
                    }}
                  />
                </Stack>

                <Box mx={{ xs: "auto", md: "0" }} ml={{ md: "auto" }}>
                  <CustomButton label="Apply" onClick={handleOpenDialog} disabled={isSubmitting} />
                </Box>
            </>
            )}

          </FormContainer>
        </Stack>
      )}
    </>
  );
}
