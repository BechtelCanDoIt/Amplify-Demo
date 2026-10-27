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

import { useCallback, useEffect, useMemo } from "react";
import {
  Autocomplete,
  Chip,
  CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@slices/store";
import {
  EmployeeBasicInfo,
  fetchEmployeesBasicInfo,
} from "@slices/employeeSlice/employee";
import { State } from "@src/types/types";

interface CommonProps {
  label: string;
  excludeEmails?: string[];
  required?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

type EmployeeEmailSelectProps =
  | (CommonProps & {
      mode: "single";
      value: string;
      onChange: (email: string) => void;
    })
  | (CommonProps & {
      mode: "multi";
      value: string[];
      onChange: (emails: string[]) => void;
    });

const SYNTHETIC_LABEL_PREFIX = "(inactive) ";

function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

function isInactive(opt: EmployeeBasicInfo): boolean {
  return opt.employeeId === "" && opt.firstName === "" && opt.lastName === "";
}

function optionLabel(opt: EmployeeBasicInfo): string {
  if (isInactive(opt)) return `${SYNTHETIC_LABEL_PREFIX}${opt.workEmail}`;
  const name = `${opt.firstName} ${opt.lastName}`.trim();
  return name ? `${name} <${opt.workEmail}>` : opt.workEmail;
}

function buildOptions(
  employees: EmployeeBasicInfo[],
  persistedEmails: string[],
): EmployeeBasicInfo[] {
  const known = new Set(employees.map((e) => emailKey(e.workEmail)));
  const synthetic: EmployeeBasicInfo[] = [];
  persistedEmails.forEach((email) => {
    const key = emailKey(email);
    if (key && !known.has(key)) {
      synthetic.push({
        employeeId: "",
        firstName: "",
        lastName: "",
        workEmail: email,
      });
      known.add(key);
    }
  });
  return [...employees, ...synthetic];
}

export default function EmployeeEmailSelect(props: EmployeeEmailSelectProps) {
  const dispatch = useAppDispatch();
  const employeesBasicInfo = useAppSelector(
    (s) => s.employee.employeesBasicInfo,
  );
  const employeeBasicInfoState = useAppSelector(
    (s) => s.employee.employeeBasicInfoState,
  );

  useEffect(() => {
    if (employeeBasicInfoState === State.idle) {
      dispatch(fetchEmployeesBasicInfo());
    }
  }, [employeeBasicInfoState, dispatch]);

  const loading = employeeBasicInfoState === State.loading;

  const persistedEmails = useMemo<string[]>(() => {
    if (props.mode === "single") return props.value ? [props.value] : [];
    return props.value;
  }, [props.mode, props.value]);

  const excludeSet = useMemo(
    () =>
      new Set(
        (props.excludeEmails ?? [])
          .map(emailKey)
          .filter((e) => e.length > 0),
      ),
    [props.excludeEmails],
  );

  const allOptions = useMemo(
    () => buildOptions(employeesBasicInfo, persistedEmails),
    [employeesBasicInfo, persistedEmails],
  );

  const visibleOptions = useMemo(
    () =>
      allOptions
        .filter((opt) => !excludeSet.has(emailKey(opt.workEmail)))
        .sort((a, b) =>
          a.workEmail.localeCompare(b.workEmail, undefined, {
            sensitivity: "base",
          }),
        ),
    [allOptions, excludeSet],
  );

  const findOptionByEmail = useCallback(
    (email: string): EmployeeBasicInfo | null => {
      if (!email) return null;
      const key = emailKey(email);
      return allOptions.find((o) => emailKey(o.workEmail) === key) ?? null;
    },
    [allOptions],
  );

  const singleSelected = useMemo(
    () => (props.mode === "single" ? findOptionByEmail(props.value) : null),
    [props.mode, props.value, findOptionByEmail],
  );

  const multiSelected = useMemo<EmployeeBasicInfo[]>(
    () =>
      props.mode === "multi"
        ? props.value
            .map((email) => findOptionByEmail(email))
            .filter((o): o is EmployeeBasicInfo => o !== null)
        : [],
    [props.mode, props.value, findOptionByEmail],
  );

  const sharedInput = (params: object, endAdornment: React.ReactNode) => (
    <TextField
      {...params}
      label={props.label}
      required={props.required}
      error={props.error}
      helperText={props.helperText}
      placeholder={props.placeholder}
      InputProps={{
        ...(params as { InputProps: object }).InputProps,
        endAdornment: (
          <>
            {loading ? <CircularProgress size={16} /> : null}
            {endAdornment}
          </>
        ),
      }}
    />
  );

  const renderOption = (
    liProps: React.HTMLAttributes<HTMLLIElement>,
    opt: EmployeeBasicInfo,
  ) => {
    const inactive = isInactive(opt);
    return (
      <li {...liProps} key={emailKey(opt.workEmail)}>
        <span style={{ opacity: inactive ? 0.6 : 1 }}>{optionLabel(opt)}</span>
      </li>
    );
  };

  if (props.mode === "single") {
    return (
      <Autocomplete
        options={visibleOptions}
        value={singleSelected}
        loading={loading}
        disabled={props.disabled}
        onBlur={props.onBlur}
        onChange={(_, opt) => props.onChange(opt?.workEmail ?? "")}
        getOptionLabel={optionLabel}
        isOptionEqualToValue={(a, b) =>
          emailKey(a.workEmail) === emailKey(b.workEmail)
        }
        renderOption={renderOption}
        renderInput={(params) =>
          sharedInput(params, params.InputProps.endAdornment)
        }
      />
    );
  }

  return (
    <Autocomplete
      multiple
      options={visibleOptions}
      value={multiSelected}
      loading={loading}
      disabled={props.disabled}
      onBlur={props.onBlur}
      filterSelectedOptions
      onChange={(_, opts) => props.onChange(opts.map((o) => o.workEmail))}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) =>
        emailKey(a.workEmail) === emailKey(b.workEmail)
      }
      renderOption={renderOption}
      renderTags={(value, getTagProps) =>
        value.map((opt, index) => {
          const inactive = isInactive(opt);
          const chip = (
            <Chip
              {...getTagProps({ index })}
              key={emailKey(opt.workEmail)}
              label={optionLabel(opt)}
              size="small"
              sx={inactive ? { opacity: 0.6 } : undefined}
            />
          );
          return inactive ? (
            <Tooltip
              key={emailKey(opt.workEmail)}
              title="This employee is no longer in the active employees list."
            >
              {chip}
            </Tooltip>
          ) : (
            chip
          );
        })
      }
      renderInput={(params) =>
        sharedInput(params, params.InputProps.endAdornment)
      }
    />
  );
}
