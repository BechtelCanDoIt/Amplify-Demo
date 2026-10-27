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

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@slices/store";
import {
  EmployeeBasicInfo,
  fetchEmployeesBasicInfo,
} from "@slices/employeeSlice/employee";
import { State } from "@src/types/types";

/** Normalizes an email for lookup — the backend compares emails with LOWER() throughout. */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Looks up employees in the cached `/employees/basic-info` directory by work email.
 *
 * The directory covers Active and Marked leaver employees only, so a lookup misses for
 * leads who have left, external leads, and current employees whose org data is incomplete
 * (the directory query inner-joins team/business unit/designation). Callers must handle a
 * `null` entry by falling back to the raw email.
 *
 * Fetches once per session, including when several consumers mount in the same render
 * commit: the thunk carries a `condition` guard that drops any dispatch made while the
 * directory is already loading or loaded, so every consumer shares one request and one
 * cached result.
 */
export function useEmployeeDirectory(): {
  lookup: (email: string | null | undefined) => EmployeeBasicInfo | null;
  loading: boolean;
} {
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

  const byEmail = useMemo(() => {
    const map = new Map<string, EmployeeBasicInfo>();
    employeesBasicInfo.forEach((employee) => {
      const key = emailKey(employee.workEmail ?? "");
      if (key) map.set(key, employee);
    });
    return map;
  }, [employeesBasicInfo]);

  const lookup = useMemo(
    () => (email: string | null | undefined) => {
      if (!email) return null;
      return byEmail.get(emailKey(email)) ?? null;
    },
    [byEmail],
  );

  return { lookup, loading: employeeBasicInfoState === State.loading };
}

/** Splits a comma-separated additional-manager email string into trimmed, non-empty emails. */
export function splitEmails(emails: string | null | undefined): string[] {
  if (!emails) return [];
  return emails
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}
