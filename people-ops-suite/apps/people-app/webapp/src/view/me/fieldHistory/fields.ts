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

/**
 * Audit column names, as they arrive on a history event's `field`.
 *
 * These are the raw database columns the backend diffs, so this list is the frontend
 * half of a contract with the TRACKED_*_FIELDS arrays in
 * backend/modules/database/history.bal. A field absent there produces no events, and
 * a control for it would open an empty popover forever.
 */
export const AUDIT_FIELDS = {
  // employee_audit
  employeeId: "employee_id",
  workEmail: "work_email",
  businessUnit: "business_unit_id",
  team: "team_id",
  subTeam: "sub_team_id",
  unit: "unit_id",
  designation: "designation_id",
  employmentType: "employment_type_id",
  company: "company_id",
  office: "office_id",
  manager: "manager_email",
  employeeStatus: "employee_status",
  workLocation: "work_location",
  jobRole: "job_role",
  secondaryJobTitle: "secondary_job_title",
  externalDesignation: "external_designation",
  house: "house_id",
  epf: "epf",
  probationEndDate: "probation_end_date",
  agreementEndDate: "agreement_end_date",
  startDate: "start_date",
  // employee_additional_managers_audit. A synthetic field name rather than a column:
  // these rows describe a relationship, so the backend reports existence (added or
  // removed) instead of diffing a value.
  additionalManager: "additional_manager",
  // employee_leadership_audit. A synthetic field name rather than a column:
  // these rows describe a relationship, so the backend reports existence
  // (added or removed) instead of diffing a value.
  leadershipGroup: "leadership_group",
  // personal_info_audit
  nicOrPassport: "nic_or_passport",
  firstName: "first_name",
  lastName: "last_name",
  title: "title",
  dob: "dob",
  gender: "gender",
  personalEmail: "personal_email",
  personalPhone: "personal_phone",
  residentNumber: "resident_number",
  addressLine1: "address_line_1",
  addressLine2: "address_line_2",
  city: "city",
  stateOrProvince: "state_or_province",
  postalCode: "postal_code",
  country: "country",
  nationality: "nationality",
  // resignation_audit
  resignationRecorded: "resignation_recorded",
  finalDayInOffice: "final_day_in_office",
  finalDayOfEmployment: "final_day_of_employment",
  resignationReason: "reason",
} as const;

export type AuditField = (typeof AUDIT_FIELDS)[keyof typeof AUDIT_FIELDS];
