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

import { useCallback, useState } from "react";

import { Box, Typography } from "@mui/material";

import {
  ConfirmationType,
  CreateEmployeeFormValues,
  EmployeeStatus,
} from "@/types/types";
import { useConfirmationModalContext } from "@context/DialogContext";
import {
  UpdateEmployeeJobInfoPayload,
  fetchEmployee,
  updateEmployeeJobInfo,
  updateResignation,
  validateEpf,
} from "@slices/employeeSlice/employee";
import { fetchEmployeeHistory } from "@slices/employeeSlice/employeeHistory";
import {
  fetchScheduledChanges,
  scheduleChange,
} from "@slices/employeeSlice/scheduledChanges";
import ScheduleChoice, {
  ScheduleSelection,
} from "@view/me/sectionEdit/ScheduleChoice";

import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { Role, selectRoles } from "@slices/authSlice/auth";
import { useAppDispatch, useAppSelector } from "@slices/store";
import {
  fetchEmployeePersonalInfo,
  updateEmployeePersonalInfo,
} from "@slices/employeeSlice/employeePersonalInfo";
import {
  diffObject,
  toJobUpdatePayload,
  toPersonalUpdatePayload,
} from "@view/employees/onboarding/EmployeeForm";
import {
  ChangeRow,
  FIELD_LABELS,
  buildChangeSummary,
  buildPersonalChangeSummary,
} from "@view/me/sectionEdit/changeSummary";

// Payload field to the database column the scheduler stores it under. Only the fields
// a change can target need mapping: a pending change records columns, while the form
// works in payload names, so the two have to be lined up to spot a clash.
const PAYLOAD_TO_COLUMN: Record<string, string> = {
  epf: "epf",
  companyId: "company_id",
  workLocation: "work_location",
  workEmail: "work_email",
  startDate: "start_date",
  secondaryJobTitle: "secondary_job_title",
  jobRole: "job_role",
  externalDesignation: "external_designation",
  managerEmail: "manager_email",
  probationEndDate: "probation_end_date",
  agreementEndDate: "agreement_end_date",
  employmentTypeId: "employment_type_id",
  designationId: "designation_id",
  officeId: "office_id",
  teamId: "team_id",
  subTeamId: "sub_team_id",
  businessUnitId: "business_unit_id",
  unitId: "unit_id",
  houseId: "house_id",
  additionalManagerEmails: "additional_manager_emails",
};

/**
 * Fields in this edit that already have a change queued against them.
 *
 * Named rather than blocked: two changes to one field are allowed and apply in date
 * order, but an admin should not find out about the earlier one after the fact.
 */
const conflictingFieldLabels = (
  payload: Record<string, unknown>,
  pending: { changes: Record<string, unknown> }[],
): string[] => {
  const queued = new Set<string>();
  pending.forEach((change) =>
    Object.keys(change.changes ?? {}).forEach((column) => queued.add(column)),
  );

  return Object.keys(payload)
    .filter((field) => {
      const column = PAYLOAD_TO_COLUMN[field];
      return column ? queued.has(column) : false;
    })
    .map(
      (field) =>
        FIELD_LABELS[field as keyof UpdateEmployeeJobInfoPayload] ?? field,
    );
};

/** Job-info fields belonging to each editable profile section. */
const SECTION_FIELDS: Record<string, (keyof UpdateEmployeeJobInfoPayload)[]> = {
  general: [
    "epf",
    "workEmail",
    "workLocation",
    "startDate",
    "secondaryJobTitle",
    "jobRole",
    "externalDesignation",
    "managerEmail",
    "additionalManagerEmails",
    "probationEndDate",
    "agreementEndDate",
    "employmentTypeId",
    "designationId",
    "companyId",
    "officeId",
    "teamId",
    "subTeamId",
    "businessUnitId",
    "unitId",
    "houseId",
    "leadershipGroupIds",
    "continuousServiceRecord",
    "employeeStatus",
  ],
  resignation: [
    "finalDayInOffice",
    "finalDayOfEmployment",
    "resignationReason",
  ],
};

/** The before/after rows shown in the confirmation dialog. */
const ChangeList = ({
  title,
  changes,
  schedulable,
  pendingConflicts,
  onScheduleChange,
}: {
  title: string;
  changes: ChangeRow[];
  /** Whether this section's fields can be given a future effective date. */
  schedulable?: boolean;
  pendingConflicts?: string[];
  onScheduleChange?: (selection: ScheduleSelection) => void;
}) => (
  <Box>
    <Typography variant="body1" sx={{ mb: changes.length ? 1.5 : 0 }}>
      Update {title}?
    </Typography>
    {changes.map((change) => (
      <Box key={change.label} sx={{ mb: 1 }}>
        <Typography
          sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}
        >
          {change.label}
        </Typography>
        <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>
          <Box component="span" sx={{ color: "text.secondary" }}>
            {change.from}
          </Box>
          {"  \u2192  "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {change.to}
          </Box>
        </Typography>
      </Box>
    ))}
    {schedulable && onScheduleChange && (
      <ScheduleChoice
        pendingConflicts={pendingConflicts ?? []}
        onChange={onScheduleChange}
      />
    )}
  </Box>
);

/** Section names as they read in the confirmation dialog. */
const SECTION_TITLES: Record<string, string> = {
  general: "General Information",
  resignation: "Resignation Details",
  personal: "Personal Information",
};

/**
 * Saves a single profile section.
 *
 * The section's fields are diffed against the values the form was seeded with, so the
 * PATCH carries only what the admin actually changed and leaves every other section's
 * data untouched. Fields outside the section are dropped even if something else nudged
 * them, which keeps one section's save from writing another's.
 */
export const useSectionSave = (employeeId: string | undefined) => {
  const dispatch = useAppDispatch();
  const { showConfirmation } = useConfirmationModalContext();
  const org = useAppSelector((state) => state.organization);
  // Read the same way org reference data is: the confirmation dialog resolves
  // leadershipGroupIds to attribute names against this list rather than showing
  // raw ids.
  const leadershipGroups = useAppSelector((state) => state.leadership.groups);
  // The prior employments offered by the relocation checkbox, so a continuous service
  // record link reads as an Employee ID rather than the employee.id it carries.
  const serviceRecords = useAppSelector(
    (state) => state.employee.continuousServiceRecord,
  );
  // Admins write resignation fields through job-info, atomically with any general
  // changes; a resignation-only caller cannot use that endpoint at all.
  const isAdmin = useAppSelector(selectRoles).includes(Role.ADMIN);
  // Read rather than fetched here: the profile loads the pending changes with the
  // record, so the dialog can warn about a clash without a round trip mid-save.
  const pendingChanges = useAppSelector(
    (state) => state.scheduledChanges.changes,
  );
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (
      section: keyof typeof SECTION_FIELDS,
      initialValues: CreateEmployeeFormValues,
      currentValues: CreateEmployeeFormValues,
    ): Promise<boolean> => {
      if (!employeeId) return false;

      // Personal information has its own endpoint and payload shape, so it does not
      // share the job-info diff below.
      if (section === "personal") {
        const before = toPersonalUpdatePayload(initialValues);
        const after = toPersonalUpdatePayload(currentValues);
        const personalPatch = diffObject(before, after);

        if (Object.keys(personalPatch).length === 0) {
          dispatch(
            enqueueSnackbarMessage({
              message: "No changes to save.",
              type: "warning",
            }),
          );
          return true;
        }

        return await new Promise<boolean>((resolve) => {
          showConfirmation(
            "Confirm Update",
            <ChangeList
              title={SECTION_TITLES[section]}
              changes={buildPersonalChangeSummary(before, after)}
            />,
            ConfirmationType.accept,
            () => {
              void (async () => {
                setIsSaving(true);
                try {
                  const result = await dispatch(
                    updateEmployeePersonalInfo({
                      employeeId,
                      // The endpoint replaces the record rather than merging, so the
                      // complete personal payload is sent, not just the diff.
                      data: after,
                    }),
                  );
                  if (updateEmployeePersonalInfo.rejected.match(result)) {
                    resolve(false);
                    return;
                  }
                  await dispatch(fetchEmployeePersonalInfo(employeeId));
                  // The per-field history controls read the same fetched history, so it
                  // is re-read after a save — otherwise the change just made has no
                  // entry beside the field until the page is loaded again.
                  dispatch(fetchEmployeeHistory(employeeId));
                  resolve(true);
                } finally {
                  setIsSaving(false);
                }
              })();
            },
            "Update",
            "Cancel",
          );
        });
      }

      // A caller who may record a resignation but not edit an employee uses the
      // dedicated endpoint: job-info is admin-only, so the shared path below would be
      // rejected for them. Admins keep using job-info, which writes resignation and
      // general fields in one atomic call.
      if (section === "resignation" && !isAdmin) {
        const current = toJobUpdatePayload(currentValues);
        const finalDayInOffice = current.finalDayInOffice ?? "";
        const finalDayOfEmployment = current.finalDayOfEmployment ?? "";
        const resignationReason = current.resignationReason ?? "";

        const changes = buildChangeSummary(
          {
            finalDayInOffice,
            finalDayOfEmployment,
            resignationReason,
          },
          toJobUpdatePayload(initialValues),
          org,
          leadershipGroups,
        );

        return await new Promise<boolean>((resolve) => {
          showConfirmation(
            "Confirm Update",
            <ChangeList title={SECTION_TITLES[section]} changes={changes} />,
            ConfirmationType.accept,
            () => {
              void (async () => {
                setIsSaving(true);
                try {
                  const result = await dispatch(
                    updateResignation({
                      employeeId,
                      payload: {
                        finalDayInOffice,
                        finalDayOfEmployment,
                        resignationReason,
                      },
                    }),
                  );
                  if (updateResignation.rejected.match(result)) {
                    resolve(false);
                    return;
                  }
                  await dispatch(fetchEmployee(employeeId));
                  dispatch(fetchEmployeeHistory(employeeId));
                  resolve(true);
                } finally {
                  setIsSaving(false);
                }
              })();
            },
            "Update",
            "Cancel",
          );
        });
      }

      const fields = SECTION_FIELDS[section];
      const fullDiff = diffObject(
        toJobUpdatePayload(initialValues),
        toJobUpdatePayload(currentValues),
      );

      const payload: Partial<UpdateEmployeeJobInfoPayload> = {};
      fields.forEach((field) => {
        if (field in fullDiff) {
          (payload as Record<string, unknown>)[field] = fullDiff[field];
        }
      });

      // Entering a leaver status clears the resignation fields, so the values typed in
      // afterwards can diff as unchanged against what was there before, and the record
      // would be saved without them. They are therefore sent alongside a status change
      // rather than trusted to the diff.
      //
      // Only alongside a status change: `payload` holds what differs, so employeeStatus
      // being in it means the status is moving in this save. Testing the resulting
      // status instead attached these fields to every later edit of someone who had
      // already left — where nothing cleared them, so they were rewritten with the
      // values they already held, and a scheduled change was refused for carrying a
      // resignation field the admin never touched.
      const current = toJobUpdatePayload(currentValues);
      const isBecomingLeaver =
        "employeeStatus" in payload &&
        (current.employeeStatus === EmployeeStatus.MarkedLeaver ||
          current.employeeStatus === EmployeeStatus.Left);

      if (isBecomingLeaver && (section === "general" || section === "resignation")) {
        payload.finalDayInOffice = current.finalDayInOffice;
        payload.finalDayOfEmployment = current.finalDayOfEmployment;
        payload.resignationReason = current.resignationReason;
      }

      if (Object.keys(payload).length === 0) {
        dispatch(
          enqueueSnackbarMessage({
            message: "No changes to save.",
            type: "warning",
          }),
        );
        return true;
      }

      // The wizard checks EPF uniqueness server-side before saving; without it an
      // admin could assign an EPF that already belongs to another employee. Only a
      // changed value is checked, so re-saving an unrelated field costs no request.
      if (payload.epf) {
        const epf = String(payload.epf).trim();
        if (epf) {
          try {
            const exists = await dispatch(validateEpf(epf)).unwrap();
            if (exists) {
              dispatch(
                enqueueSnackbarMessage({
                  message: `EPF ${epf} already belongs to another employee.`,
                  type: "error",
                }),
              );
              return false;
            }
          } catch {
            dispatch(
              enqueueSnackbarMessage({
                message: "Failed to validate EPF. The change was not saved.",
                type: "error",
              }),
            );
            return false;
          }
        }
      }

      const changes = buildChangeSummary(
        payload,
        toJobUpdatePayload(initialValues),
        org,
        leadershipGroups,
        serviceRecords,
      );

      const applyUpdate = async (): Promise<boolean> => {
        setIsSaving(true);
        try {
          const result = await dispatch(
            updateEmployeeJobInfo({
              employeeId,
              payload: payload as UpdateEmployeeJobInfoPayload,
            }),
          );

          if (updateEmployeeJobInfo.rejected.match(result)) {
            // updateEmployeeJobInfo already surfaces the failure via snackbar.
            return false;
          }

          // Re-read so the section renders what was actually persisted rather than
          // the values that were sent — the backend derives some fields on write.
          await dispatch(fetchEmployee(employeeId));
          dispatch(fetchEmployeeHistory(employeeId));
          return true;
        } finally {
          setIsSaving(false);
        }
      };

      // Writes the edit as a pending change instead of applying it, leaving the
      // record as it is until the date arrives.
      const applySchedule = async (effectiveDate: string): Promise<boolean> => {
        setIsSaving(true);
        try {
          const result = await dispatch(
            scheduleChange({
              employeeId,
              effectiveDate,
              changes: payload as Record<string, unknown>,
            }),
          );
          if (scheduleChange.rejected.match(result)) {
            // The thunk has already surfaced the reason, which for a refused field
            // names the field: leaving the editor open lets it be corrected.
            return false;
          }
          await dispatch(fetchScheduledChanges(employeeId));
          return true;
        } finally {
          setIsSaving(false);
        }
      };

      // Scheduling is offered for general information only: resignation details and
      // personal information are written through their own endpoints, which the
      // scheduler has no path to.
      const schedulable = section === "general";
      const pendingConflicts = schedulable
        ? conflictingFieldLabels(payload, pendingChanges)
        : [];

      // Default to the unchanged behaviour, so a dialog dismissed without touching
      // the choice applies now exactly as it always did.
      let selection: ScheduleSelection = { mode: "now" };

      // The dialog is driven by a callback rather than a promise, so bridge it into
      // one: the caller needs to know whether the section may leave edit mode, and
      // dismissing the dialog has to leave the editor open with the changes intact.
      return await new Promise<boolean>((resolve) => {
        showConfirmation(
          "Confirm Update",
          <ChangeList
            title={SECTION_TITLES[section]}
            changes={changes}
            schedulable={schedulable}
            pendingConflicts={pendingConflicts}
            onScheduleChange={(next) => {
              selection = next;
            }}
          />,
          ConfirmationType.accept,
          () => {
            if (selection.mode === "scheduled") {
              if (!selection.effectiveDate) {
                dispatch(
                  enqueueSnackbarMessage({
                    message: "Pick an effective date, or choose Apply now.",
                    type: "warning",
                  }),
                );
                resolve(false);
                return;
              }
              void applySchedule(selection.effectiveDate).then(resolve);
              return;
            }
            void applyUpdate().then(resolve);
          },
          "Update",
          "Cancel",
        );

        // showConfirmation reports OK but not dismissal, so pressing Cancel or the close
        // icon resolves nothing: this promise stays pending for the life of the form
        // instance. Edit mode is left open either way, which is the right outcome for a
        // cancel, so nothing is visibly wrong today.
        //
        // It is only harmless because nothing here reads Formik's isSubmitting, which
        // stays true once a cancelled save leaves it that way. Do not gate anything on
        // it in this section — `disabled={isSubmitting}` on Save, as four dialogs
        // elsewhere in this app do, would make the section unsavable after one cancel,
        // with no error to explain it. Give showConfirmation an onCancel and resolve
        // false here before adding any such thing.
      });
    },
    [
      dispatch,
      employeeId,
      isAdmin,
      leadershipGroups,
      org,
      pendingChanges,
      serviceRecords,
      showConfirmation,
    ],
  );

  return { save, isSaving };
};
