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
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  createFilterOptions,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";

import { useEffect, useState } from "react";

import { selectAppConfig } from "@root/src/slices/configSlice/config";
import { selectEmployeeState, selectEmployees } from "@root/src/slices/employeeSlice/employee";
import { useAppSelector } from "@root/src/slices/store";
import { CachedMail, EmployeeStatus, State } from "@root/src/types/types";

interface EmployeeOption {
  displayName: string;
  email: string;
  thumbnail: string | null;
  isFixed?: boolean;
}

const getOptionLabel = (option: EmployeeOption) =>
  option.displayName ? `${option.displayName} (${option.email})` : option.email;

// Cap rendered matches so typing doesn't mount hundreds of Autocomplete list items at once.
const filterOptions = createFilterOptions<EmployeeOption>({
  stringify: getOptionLabel,
  limit: 50,
});

interface NotifyPeopleProps {
  selectedEmails: string[];
  onEmailsChange: (emails: string[]) => void;
  onMandatoryEmailsChange: (emails: string[]) => void;
}

export default function NotifyPeople({
  selectedEmails,
  onEmailsChange,
  onMandatoryEmailsChange,
}: NotifyPeopleProps) {
  const theme = useTheme();
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [fixedEmails, setFixedEmails] = useState<string[]>([]);

  const employeeState = useAppSelector(selectEmployeeState);
  const employees = useAppSelector(selectEmployees);
  const loading = employeeState === State.idle || employeeState === State.loading;

  const appConfig = useAppSelector(selectAppConfig);
  useEffect(() => {
    if (!appConfig?.cachedEmails) return;

    const defaultMails: CachedMail = appConfig.cachedEmails;

    const mandatoryOptions = defaultMails.mandatoryMails.map((mail) => ({
      displayName: mail.email,
      email: mail.email,
      thumbnail: mail.thumbnail || null,
      isFixed: true,
    }));

    const optionalOptions = defaultMails.optionalMails
      .filter((mail) => !defaultMails.mandatoryMails.find((m) => m.email === mail.email))
      .map((mail) => ({
        displayName: mail.email,
        email: mail.email,
        thumbnail: mail.thumbnail || null,
        isFixed: false,
      }));

    const fixedEmailList = mandatoryOptions.map((m) => m.email);

    setFixedEmails(fixedEmailList);
    onMandatoryEmailsChange(fixedEmailList);
    onEmailsChange([...fixedEmailList, ...optionalOptions.map((o) => o.email)]);

    setEmployeeOptions([...mandatoryOptions, ...optionalOptions]);
  }, [appConfig, onMandatoryEmailsChange, onEmailsChange]);

  useEffect(() => {
    if (employees.length > 0) {
      const employeeOptionsFromApi = employees
        .filter((employee) => employee.employeeStatus !== EmployeeStatus.LEFT)
        .map((employee) => ({
          displayName: `${employee.firstName} ${employee.lastName}`.trim(),
          email: employee.workEmail,
          thumbnail: employee.employeeThumbnail,
          isFixed: fixedEmails.includes(employee.workEmail),
        }));

      setEmployeeOptions((prev) => {
        const apiByEmail = new Map(employeeOptionsFromApi.map((o) => [o.email, o]));
        const existingEmails = new Set(prev.map((o) => o.email));

        // Update existing cached entries with real name + thumbnail from API
        const updated = prev.map((opt) => {
          const apiMatch = apiByEmail.get(opt.email);
          if (apiMatch) {
            return { ...opt, displayName: apiMatch.displayName, thumbnail: apiMatch.thumbnail };
          }
          return opt;
        });

        // Append API employees not already in the list
        const newEntries = employeeOptionsFromApi.filter((opt) => !existingEmails.has(opt.email));
        return [...updated, ...newEntries];
      });
    }
  }, [employees, fixedEmails]);

  const selectedOptions = employeeOptions
    .filter((opt) => opt.isFixed || selectedEmails.includes(opt.email))
    .sort((a, b) => {
      if (a.isFixed && !b.isFixed) return -1;
      if (!a.isFixed && b.isFixed) return 1;
      return 0;
    });

  return (
    <Stack gap={2}>
      <Stack direction="row" alignItems="center" gap={1}>
        <GroupsRoundedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ color: theme.palette.customText.primary.p1.active }}>
          Notify people
        </Typography>
      </Stack>
      <Autocomplete
        multiple
        options={employeeOptions}
        value={selectedOptions}
        loading={loading}
        loadingText="Loading employees..."
        noOptionsText="No employees found"
        onChange={(_, newValue) => {
          const newEmails = [
            ...fixedEmails,
            ...newValue.filter((opt) => !opt.isFixed).map((opt) => opt.email),
          ];
          onEmailsChange(newEmails);
        }}
        getOptionLabel={getOptionLabel}
        filterOptions={filterOptions}
        isOptionEqualToValue={(option, value) => option.email === value.email}
        renderOption={(props, option) => (
          <li
            {...props}
            key={option.email}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Avatar src={option.thumbnail ?? undefined} sx={{ width: 32, height: 32 }}>
              {option.displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" noWrap>
                {option.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {option.email}
              </Typography>
            </Box>
          </li>
        )}
        disabled={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search people or groups"
            size="small"
            placeholder={loading ? "Loading employees..." : undefined}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && (
                      <InputAdornment position="end">
                        <CircularProgress size={18} />
                      </InputAdornment>
                    )}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.email}
              label={option.displayName}
              avatar={
                <Avatar src={option.thumbnail ?? undefined} sx={{ width: 24, height: 24 }}>
                  {option.displayName.charAt(0).toUpperCase()}
                </Avatar>
              }
              size="small"
              onDelete={option.isFixed ? undefined : getTagProps({ index }).onDelete}
            />
          ))
        }
        sx={{
          "& .MuiChip-root": {
            backgroundColor: theme.palette.surface.territory.active,
            color: theme.palette.customText.primary.p2.active,
            fontWeight: 500,
            borderRadius: "8px",
            border: `1px solid ${theme.palette.customBorder.territory.active}`,
          },
          "& .MuiChip-deleteIcon": {
            color: theme.palette.customText.primary.p4.active,
            "&:hover": { color: theme.palette.error.main },
          },
        }}
      />
    </Stack>
  );
}
