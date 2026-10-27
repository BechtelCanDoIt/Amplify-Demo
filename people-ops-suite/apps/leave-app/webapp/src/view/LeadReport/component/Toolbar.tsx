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

import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, Avatar, Box, Button, Chip, CircularProgress, InputAdornment, Stack, Switch, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Dayjs } from "dayjs";
import { useSnackbar } from "notistack";

import { useEffect, useState } from "react";

import { selectEmployeeState, selectEmployees } from "@root/src/slices/employeeSlice/employee";
import { useAppSelector } from "@root/src/slices/store";
import { EmployeeStatus, State } from "@root/src/types/types";

const EMPLOYEE_STATUS_OPTIONS: EmployeeStatus[] = [
  EmployeeStatus.ACTIVE,
  EmployeeStatus.MARKED_LEAVER,
  EmployeeStatus.LEFT,
];

interface ToolbarProps {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  onStartDateChange: (date: Dayjs | null) => void;
  onEndDateChange: (date: Dayjs | null) => void;
  onFetchReport: () => void;
  loading: boolean;
  showToggle?: boolean;
  toggleChecked?: boolean;
  onToggleChange?: (checked: boolean) => void;
  selectedEmail?: string;
  onEmailChange?: (email: string) => void;
  employeeStatuses?: EmployeeStatus[];
  onEmployeeStatusesChange?: (statuses: EmployeeStatus[]) => void;
}

export default function Toolbar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFetchReport,
  loading,
  showToggle = false,
  toggleChecked = true,
  onToggleChange,
  selectedEmail = "",
  onEmailChange,
  employeeStatuses = [EmployeeStatus.ACTIVE, EmployeeStatus.MARKED_LEAVER],
  onEmployeeStatusesChange,
}: ToolbarProps) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const employees = useAppSelector(selectEmployees);
  const employeeState = useAppSelector(selectEmployeeState);
  const employeesLoading = employeeState === State.loading;

  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ label: string; displayName: string; email: string; thumbnail: string | null; employeeStatus?: string | null }>
  >([{ label: "All Employees", displayName: "All Employees", email: "", thumbnail: null }]);

  useEffect(() => {
    if (employees.length > 0) {
      const options = [
        { label: "All Employees", displayName: "All Employees", email: "", thumbnail: null },
        ...employees.map((emp) => ({
          label: `${emp.firstName} ${emp.lastName} (${emp.workEmail})`,
          displayName: `${emp.firstName} ${emp.lastName}`.trim(),
          email: emp.workEmail,
          thumbnail: emp.employeeThumbnail ?? null,
          employeeStatus: emp.employeeStatus,
        })),
      ];
      setEmployeeOptions(options);
    }
  }, [employees]);

  const handleFetchReport = () => {
    if (!startDate || !endDate) {
      enqueueSnackbar("Please select both start and end dates", { variant: "error" });
      return;
    }

    if (endDate.isBefore(startDate, "day")) {
      enqueueSnackbar("End date must be after start date", { variant: "error" });
      return;
    }

    onFetchReport();
  };

  return (
    <Stack gap="1.5rem" width="100%">
      {/* Employee, Date Pickers and Search Button Row */}
      <Stack direction="row" width="100%" alignItems="center" gap="1.5rem" flexWrap="wrap">
        {/* Employee Dropdown for People Ops Team */}
        {showToggle && onEmailChange && (
          <Autocomplete
            options={employeeOptions}
            value={employeeOptions.find((opt) => opt.email === selectedEmail) || employeeOptions[0]}
            onChange={(_, newValue) => onEmailChange(newValue?.email || "")}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.email === value.email}
            loading={employeesLoading}
            loadingText="Loading employees..."
            sx={{ flex: 1, minWidth: 220 }}
            renderOption={(props, option) => (
              <li {...props} key={option.email} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar src={option.thumbnail ?? undefined} sx={{ width: 32, height: 32 }}>
                  {option.displayName.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" noWrap>{option.displayName}</Typography>
                  {option.email && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Typography variant="caption" color="text.secondary" noWrap>{option.email}</Typography>
                      {option.employeeStatus === EmployeeStatus.MARKED_LEAVER && (
                        <Chip label={EmployeeStatus.MARKED_LEAVER} color="warning" size="small" sx={{ height: 16, fontSize: "0.65rem" }} />
                      )}
                      {option.employeeStatus === EmployeeStatus.LEFT && (
                        <Chip label={EmployeeStatus.LEFT} size="small" sx={{ height: 16, fontSize: "0.65rem", opacity: 0.7 }} />
                      )}
                    </Box>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Employee"
                size="small"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {employeesLoading && (
                          <InputAdornment position="end">
                            <CircularProgress size={16} />
                          </InputAdornment>
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        )}

        {/* Date Pickers */}
        <DatePicker
          label="From"
          value={startDate}
          onChange={onStartDateChange}
          format="YYYY-MM-DD"
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
            },
          }}
        />
        <DatePicker
          label="To"
          value={endDate}
          onChange={onEndDateChange}
          format="YYYY-MM-DD"
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
            },
          }}
        />

        {/* Search Button */}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SearchIcon />}
          onClick={handleFetchReport}
          disabled={loading}
          sx={{ px: "3rem", py: "0.5rem" }}
        >
          {loading ? "Loading..." : "Fetch Report"}
        </Button>
      </Stack>
      {/* Toggle and Checkbox Row */}
      <Stack direction="row" width="100%" alignItems="center" gap="1.5rem" flexWrap="wrap">
        {/* Toggle for All Employees / My Subordinates */}
        {showToggle && onToggleChange && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1,
              borderRadius: 1,
              backgroundColor:
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
              }`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Switch
                checked={!toggleChecked}
                onChange={(e) => onToggleChange(!e.target.checked)}
                size="small"
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: theme.palette.primary.main,
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: !toggleChecked ? 600 : 400,
                  color: !toggleChecked ? theme.palette.text.primary : theme.palette.text.secondary,
                  transition: "all 0.2s ease",
                }}
              >
                Subordinates only
              </Typography>
            </Box>
          </Box>
        )}

        {/* Employee Status multi-select for People Ops Team */}
        {showToggle && onEmployeeStatusesChange && (
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={EMPLOYEE_STATUS_OPTIONS}
            value={employeeStatuses}
            onChange={(_, newValue) => onEmployeeStatusesChange(newValue as EmployeeStatus[])}
            getOptionLabel={(option) => option}
            isOptionEqualToValue={(option, value) => option === value}
            slotProps={{
              chip: {
                size: "small",
                sx: {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  "& .MuiChip-deleteIcon": { color: theme.palette.primary.main },
                },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Employee Status"
                sx={{ minWidth: 260 }}
              />
            )}
          />
        )}
      </Stack>
    </Stack>
  );
}
