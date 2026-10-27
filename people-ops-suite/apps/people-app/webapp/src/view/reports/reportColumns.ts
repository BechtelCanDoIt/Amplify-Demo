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

/** A single exportable column definition for the employee CSV report. */
export interface ColumnDef {
  /** Canonical key sent to the backend — must match EMPLOYEE_CSV_COLUMNS / RESIGNATION_CSV_COLUMNS in utils.bal */
  key: string;
  /** Human-readable label shown in the column selector dialog. */
  label: string;
  /** Display group — aligned to the Onboard page section names. */
  group: string;
  /**
   * Personal information, excluded from the default selection.
   *
   * These columns carry an employee's private details, so an export only contains them
   * when an admin deliberately ticks them — a default report stays free of personal data
   * and matches what existing report consumers already expect.
   */
  personal?: boolean;
}

/** 26 columns available for all employee report types. Groups mirror the Onboard page sections. */
export const EMPLOYEE_COLUMNS: ColumnDef[] = [
  // Identity — mirrors "Identity" section of Onboard JobInfo
  { key: "employeeId",            label: "Employee Id",             group: "Identity" },
  { key: "firstName",             label: "First Name",              group: "Identity" },
  { key: "lastName",              label: "Last Name",               group: "Identity" },
  { key: "gender",                label: "Gender",                  group: "Identity" },
  { key: "workEmail",             label: "Work Email",              group: "Identity" },
  { key: "epfNumber",             label: "EPF Number",              group: "Identity" },
  // Job & Career — mirrors "Job & Team" section of Onboard JobInfo
  { key: "company",               label: "Company",                 group: "Job & Career" },
  { key: "location",              label: "Location",                group: "Job & Career" },
  { key: "employmentType",        label: "Employment Type",         group: "Job & Career" },
  { key: "jobRole",               label: "Job Role",                group: "Job & Career" },
  { key: "externalDesignation",   label: "External Designation",    group: "Job & Career" },
  { key: "jobBand",               label: "Job Band",                group: "Job & Career" },
  { key: "employeeStatus",        label: "Employee Status",         group: "Job & Career" },
  { key: "office",                label: "Office",                  group: "Job & Career" },
  // Organisation — mirrors org hierarchy fields in Onboard JobInfo
  { key: "businessUnit",          label: "Business Unit",           group: "Organisation" },
  { key: "team",                  label: "Team",                    group: "Organisation" },
  { key: "subTeam",               label: "Sub Team",                group: "Organisation" },
  { key: "unit",                  label: "Unit",                    group: "Organisation" },
  { key: "house",                 label: "House",                   group: "Organisation" },
  { key: "leadershipGroups",      label: "Leadership Attributes",   group: "Organisation" },
  // Dates & Service — mirrors date fields in Onboard JobInfo
  { key: "startDate",             label: "Start Date",              group: "Dates & Service" },
  { key: "continuousServiceDate", label: "Continuous Service Date", group: "Dates & Service" },
  { key: "lengthOfService",       label: "Length Of Service",       group: "Dates & Service" },
  { key: "probationEndDate",      label: "Probation End Date",      group: "Dates & Service" },
  { key: "agreementEndDate",      label: "Agreement End Date",      group: "Dates & Service" },
  // Management — mirrors management fields in Onboard JobInfo
  { key: "reportsTo",             label: "Reports To",              group: "Management" },
  { key: "leadEmail",             label: "Lead Email",              group: "Management" },
  { key: "additionalManager",     label: "Additional Manager",      group: "Management" },
];

/** Personal information columns, offered on every report but never selected by default. */
export const PERSONAL_COLUMNS: ColumnDef[] = [
  { key: "nicOrPassport",     label: "NIC/Passport",       group: "Personal", personal: true },
  { key: "dateOfBirth",       label: "Date of Birth",      group: "Personal", personal: true },
  { key: "nationality",       label: "Nationality",        group: "Personal", personal: true },
  { key: "personalEmail",     label: "Personal Email",     group: "Personal", personal: true },
  { key: "personalPhone",     label: "Personal Phone",     group: "Personal", personal: true },
  { key: "residentNumber",    label: "Resident Number",    group: "Personal", personal: true },
  { key: "addressLine1",      label: "Address Line 1",     group: "Personal", personal: true },
  { key: "addressLine2",      label: "Address Line 2",     group: "Personal", personal: true },
  { key: "city",              label: "City",               group: "Personal", personal: true },
  { key: "stateOrProvince",   label: "State/Province",     group: "Personal", personal: true },
  { key: "postalCode",        label: "Postal Code",        group: "Personal", personal: true },
  { key: "country",           label: "Country",            group: "Personal", personal: true },
  { key: "emergencyContacts", label: "Emergency Contacts", group: "Personal", personal: true },
];

/** 4 extra columns available only on the Resignations report. */
export const RESIGNATION_EXTRA_COLUMNS: ColumnDef[] = [
  { key: "resignationDate",       label: "Resignation Date",        group: "Resignation" },
  { key: "finalDayInOffice",      label: "Final Day in Office",     group: "Resignation" },
  { key: "finalDayOfEmployment",  label: "Final Day of Employment", group: "Resignation" },
  { key: "resignationReason",     label: "Resignation Reason",      group: "Resignation" },
];

/** Returns the full ordered column list for a given report type. */
export function getColumnsForStatus(isResignation: boolean): ColumnDef[] {
  return isResignation
    ? [...EMPLOYEE_COLUMNS, ...RESIGNATION_EXTRA_COLUMNS, ...PERSONAL_COLUMNS]
    : [...EMPLOYEE_COLUMNS, ...PERSONAL_COLUMNS];
}

/**
 * The keys selected when a report first loads, and when the selection is reset.
 *
 * Personal columns are deliberately left out: they are offered in the selector but an
 * export carries them only once an admin has asked for them.
 */
export function getAllKeys(isResignation: boolean): string[] {
  return getColumnsForStatus(isResignation)
    .filter((c) => !c.personal)
    .map((c) => c.key);
}
