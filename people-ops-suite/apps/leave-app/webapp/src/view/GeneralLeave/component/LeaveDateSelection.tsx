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
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Box, Chip, CircularProgress, Stack, Typography, useTheme } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";

import { useEffect, useState } from "react";

import {
  formatDateForApi,
  getPeriodType,
  validateLeaveRequest,
} from "@root/src/services/leaveService";
import { DayPortion, LeaveType, PeriodType } from "@root/src/types/types";

interface LeaveDateSelectionProps {
  onDaysChange: (days: number) => void;
  onDatesChange: (startDate: Dayjs | null, endDate: Dayjs | null) => void;
  onWorkingDaysChange: (workingDays: number) => void;
  onValidatingChange?: (validating: boolean) => void;
  selectedDayPortion?: DayPortion | null;
  hasError?: boolean;
  onErrorClear?: () => void;
  selectedLeaveType?: LeaveType;
}

export default function LeaveDateSelection({
  onDaysChange,
  onDatesChange,
  onWorkingDaysChange,
  onValidatingChange,
  selectedDayPortion,
  hasError = false,
  onErrorClear,
}: LeaveDateSelectionProps) {
  const theme = useTheme();
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [workingDaysSelected, setWorkingDaysSelected] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const calculateTotalDays = (start: Dayjs | null, end: Dayjs | null): number => {
    if (!start || !end) return 0;
    if (end.isBefore(start, "day")) return 0;
    return end.diff(start, "day") + 1;
  };

  const [daysSelected, setDaysSelected] = useState(calculateTotalDays(startDate, endDate));

  useEffect(() => {
    onDaysChange(daysSelected);
  }, [daysSelected, onDaysChange]);

  useEffect(() => {
    if (startDate && endDate && selectedDayPortion) {
      validateDates(startDate, endDate);
    }
  }, [selectedDayPortion]);

  useEffect(() => {
    const today = dayjs().startOf("day");
    setStartDate(today);
    setEndDate(today);
    setDaysSelected(calculateTotalDays(today, today));
    onDatesChange(today, today);
  }, []);

  const validateDates = async (start: Dayjs | null, end: Dayjs | null) => {
    setDaysSelected(calculateTotalDays(start, end));
    if (!start || !end) {
      setWorkingDaysSelected(0);
      onWorkingDaysChange(0);
      return;
    }

    if (end.isBefore(start, "day")) {
      setWorkingDaysSelected(0);
      onWorkingDaysChange(0);
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    onValidatingChange?.(true);
    try {
      const totalDays = calculateTotalDays(start, end);
      let periodType: PeriodType;
      let isMorningLeave: boolean | null = null;

      switch (selectedDayPortion) {
        case DayPortion.FULL:
          periodType = totalDays === 1 ? PeriodType.ONE : PeriodType.MULTIPLE;
          isMorningLeave = null;
          break;
        case DayPortion.FIRST:
          periodType = PeriodType.HALF;
          isMorningLeave = true;
          break;
        case DayPortion.SECOND:
          periodType = PeriodType.HALF;
          isMorningLeave = false;
          break;
        default:
          periodType = getPeriodType(totalDays);
          isMorningLeave = null;
          break;
      }
      const response = await validateLeaveRequest(
        {
          periodType,
          startDate: formatDateForApi(start),
          endDate: formatDateForApi(end),
          isMorningLeave,
        },
        true,
      );

      setWorkingDaysSelected(response.workingDays);
      onWorkingDaysChange(response.workingDays);
    } catch (error: any) {
      console.error("Error validating leave dates:", error);
      const message =
        error?.response?.data?.message || "Failed to validate dates. Please try again.";
      setValidationError(message);
      setWorkingDaysSelected(0);
      onWorkingDaysChange(0);
    } finally {
      setIsValidating(false);
      onValidatingChange?.(false);
    }
  };

  const handleStartDateChange = (newValue: Dayjs | null) => {
    setStartDate(newValue);
    onDatesChange(newValue, endDate);

    if (newValue && endDate && endDate.isBefore(newValue, "day")) {
      setEndDate(null);
      onDatesChange(newValue, null);
      setWorkingDaysSelected(0);
    } else if (newValue && endDate) {
      validateDates(newValue, endDate);
    }
  };

  const handleEndDateChange = (newValue: Dayjs | null) => {
    setEndDate(newValue);
    onDatesChange(startDate, newValue);

    if (startDate && newValue) {
      validateDates(startDate, newValue);
    }
  };

  const getStatusConfig = () => {
    if (isValidating) return { label: "Validating…", color: "warning" as const, icon: null };
    if (validationError)
      return {
        label: validationError,
        color: "error" as const,
        icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />,
      };
    if (!startDate || !endDate)
      return {
        label: "Select dates",
        color: "warning" as const,
        icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />,
      };
    if (endDate.isBefore(startDate, "day"))
      return {
        label: "Invalid range",
        color: "error" as const,
        icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />,
      };
    if (workingDaysSelected <= 0)
      return {
        label: "No working days",
        color: "warning" as const,
        icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} />,
      };
    return {
      label: "Valid selection",
      color: "success" as const,
      icon: <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />,
    };
  };

  const status = getStatusConfig();

  const displayDaysSelected =
    selectedDayPortion === DayPortion.FIRST || selectedDayPortion === DayPortion.SECOND
      ? workingDaysSelected
      : daysSelected;

  return (
    <Stack direction="column" flex={1} gap={2.5}>
      <Stack direction="row" alignItems="center" gap={1}>
        <CalendarMonthRoundedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p1.active }}>
          Date Selection
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={(newValue) => {
            handleStartDateChange(newValue);
            onErrorClear?.();
          }}
          format="YYYY-MM-DD"
          minDate={dayjs().startOf("year")}
          slotProps={{
            textField: {
              error: hasError,
              fullWidth: true,
              size: "small",
            },
          }}
        />
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={(newValue) => {
            handleEndDateChange(newValue);
            onErrorClear?.();
          }}
          minDate={startDate || undefined}
          format="YYYY-MM-DD"
          slotProps={{
            textField: {
              error: hasError,
              fullWidth: true,
              size: "small",
            },
          }}
        />
      </Stack>

      {/* Day counters */}
      <Stack direction="row" gap={2} flexWrap="wrap">
        <Box
          sx={{
            flex: 1,
            minWidth: 120,
            px: 2,
            py: 1.5,
            borderRadius: "10px",
            backgroundColor: theme.palette.surface.territory.active,
            border: `1px solid ${theme.palette.customBorder.territory.active}`,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.customText.primary.p1.active,
              fontWeight: 600,
            }}
          >
            {displayDaysSelected}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.customText.primary.p3.active }}>
            Days selected
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 120,
            px: 2,
            py: 1.5,
            borderRadius: "10px",
            backgroundColor: theme.palette.surface.territory.active,
            border: `1px solid ${theme.palette.customBorder.territory.active}`,
            textAlign: "center",
          }}
        >
          <Box sx={{ height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isValidating ? (
              <CircularProgress size={20} sx={{ color: theme.palette.primary.main }} />
            ) : (
              <Typography
                variant="h5"
                sx={{
                  color: validationError ? theme.palette.error.main : theme.palette.primary.main,
                  fontWeight: 600,
                }}
              >
                {validationError ? "—" : workingDaysSelected}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: theme.palette.customText.primary.p3.active }}>
            Working days
          </Typography>
        </Box>
      </Stack>

      {/* Status chip */}
      <Chip
        icon={
          isValidating ? (
            <CircularProgress size={14} sx={{ color: "inherit" }} />
          ) : (
            (status.icon ?? undefined)
          )
        }
        label={status.label}
        color={status.color}
        variant="outlined"
        size="small"
        sx={{ alignSelf: "flex-start", borderRadius: "8px" }}
      />
    </Stack>
  );
}
