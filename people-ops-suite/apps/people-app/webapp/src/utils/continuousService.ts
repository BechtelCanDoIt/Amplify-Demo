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

import dayjs from "dayjs";
import { EmployeeStatus } from "@/types/types";
import { ContinuousServiceRecordInfo } from "@slices/employeeSlice/employee";

/**
 * Whether a prior record can be offered as the employment another one continues from.
 *
 * Mirrors the backend's isEligiblePriorEmployment, which is the real guard: the record
 * must have ended or be ending (Left or Marked leaver — a relocation is onboarded while
 * the old employment is still Marked leaver), must have started before the employment
 * being linked, and must
 * not be that employment itself. The start-date rule is what stops a record being linked
 * forwards, or two records being linked in a cycle.
 *
 * @param record Candidate from the continuous-service-records lookup
 * @param startDate Start date of the employment being linked; when it is not known yet,
 *   only the status and self checks apply and the backend checks the date on save
 * @param employeeId Employee ID of the employment being linked, if it already exists
 */
export const isEligiblePriorEmployment = (
  record: ContinuousServiceRecordInfo,
  startDate: string | null | undefined,
  employeeId?: string | null,
): boolean => {
  if (
    record.employeeStatus !== EmployeeStatus.Left &&
    record.employeeStatus !== EmployeeStatus.MarkedLeaver
  )
    return false;
  if (employeeId && record.employeeId === employeeId) return false;
  const start = completeStartDate(startDate);
  if (!start) return true;
  return dayjs(record.startDate).isBefore(start, "day");
};

/**
 * The start date as a date, or null while it is not a finished, realistic date.
 *
 * Date pickers pass every keystroke through: typing 10/01/2026 goes by "0002-10-01",
 * "0020-10-01" and "0202-10-01" on the way. Judging a record against those would rule
 * it out for a moment and untick a relocation link the finished date keeps, so only a
 * complete YYYY-MM-DD date from 1900 on counts.
 */
const completeStartDate = (
  startDate: string | null | undefined,
): dayjs.Dayjs | null => {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  // The year is read from the text: dayjs maps years below 100 onto 1900-1999, so
  // "0002" would otherwise pass as 1902.
  if (Number(startDate.slice(0, 4)) < 1900) return null;
  const start = dayjs(startDate);
  return start.isValid() ? start : null;
};

/**
 * Whether a selected continuous service link has stopped being valid.
 *
 * The eligible list changes as the form's start date changes. When the selected record
 * drops out of it, the form must clear the link: otherwise the stale id is sent on save
 * and refused, and if no records remain the relocation checkbox is hidden, so the admin
 * could not untick it.
 *
 * @param eligible Records currently offered, after isEligiblePriorEmployment
 * @param selectedId The link held in the form, if any
 */
export const isStaleContinuousServiceLink = (
  eligible: ContinuousServiceRecordInfo[],
  selectedId: number | null | undefined,
): boolean =>
  selectedId != null && !eligible.some((record) => record.id === selectedId);

