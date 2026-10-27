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

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  Tooltip,
  useTheme,
} from "@mui/material";
import { useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BaseTextField } from "@component/common/FieldInput/BasicFieldInput/BaseTextField";
import {
  CareerFunction,
  Designation,
  CreateDesignationPayload,
  UpdateDesignationPayload,
  JOB_BAND_CLEAR_SENTINEL,
} from "@slices/careerFunctionSlice/careerFunction";
import { isDuplicateDesignationName } from "./duplicateDesignation.utils";

interface DesignationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDesignationPayload | UpdateDesignationPayload) => Promise<void>;
  designation?: Designation | null;
  careerFunctions: CareerFunction[];
  defaultCareerFunctionId: number | null;
  allDesignations: Designation[];
}

// "" is the Select's empty state — nothing chosen. There is no longer an "Unassigned"
// option: every designation must belong to a career function. Existing rows created
// before that rule can still be unassigned, and they open with the Select blank until
// a career function is picked.
const UNASSIGNED_VALUE = "";

const validationSchema = Yup.object({
  designation: Yup.string()
    .trim()
    .required("Name is required")
    .max(150, "Name must be at most 150 characters"),
  // Job band is optional: null (blank) or any non-negative integer, 0 included.
  // Negatives are rejected because JOB_BAND_CLEAR_SENTINEL is -1 — accepting it as a
  // real band would clear the column instead of setting it.
  jobBand: Yup.number()
    .nullable()
    .integer("Job band must be a whole number")
    .min(0, "Job band cannot be negative"),
  // Required: a designation must belong to a career function. The Select carries string
  // values, so "" (nothing chosen) is the failing case.
  careerFunctionId: Yup.string().required("Career function is required"),
});

export default function DesignationDialog({
  open,
  onClose,
  onSubmit,
  designation,
  careerFunctions,
  defaultCareerFunctionId,
  allDesignations,
}: DesignationDialogProps) {
  const theme = useTheme();
  const isEdit = designation != null;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      designation: designation?.designation ?? "",
      jobBand: designation?.jobBand != null ? String(designation.jobBand) : "",
      careerFunctionId:
        (isEdit ? designation?.careerFunctionId : defaultCareerFunctionId) != null
          ? String(isEdit ? designation?.careerFunctionId : defaultCareerFunctionId)
          : UNASSIGNED_VALUE,
      isActive: designation?.isActive ?? true,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const trimmedName = values.designation.trim();
      // A career function is mandatory, and the Select no longer offers a way to clear
      // it. Validation already rejects "", so this is only a type-level narrowing.
      if (values.careerFunctionId === UNASSIGNED_VALUE) {
        setSubmitting(false);
        return;
      }
      const resolvedCareerFunctionId = Number(values.careerFunctionId);
      const resolvedJobBand = values.jobBand === "" ? null : Number(values.jobBand);

      const payload = isEdit
        ? ({
            designation: trimmedName,
            jobBand: resolvedJobBand === null ? JOB_BAND_CLEAR_SENTINEL : resolvedJobBand,
            careerFunctionId: resolvedCareerFunctionId,
            isActive: values.isActive,
          } satisfies UpdateDesignationPayload)
        : ({
            designation: trimmedName,
            jobBand: resolvedJobBand,
            careerFunctionId: resolvedCareerFunctionId,
          } satisfies CreateDesignationPayload);
      try {
        await onSubmit(payload);
        onClose();
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  // Resolved number|null career function id for the duplicate check — not the "" select
  // value, which the utility would never match against. "" still resolves to null: an
  // existing unassigned designation opens with a blank Select, and until a career
  // function is picked the check must compare it against the unassigned group it
  // actually still belongs to.
  const resolvedCareerFunctionIdForCheck =
    formik.values.careerFunctionId === UNASSIGNED_VALUE ? null : Number(formik.values.careerFunctionId);

  // The DB unique index (`uk_active_designation_per_career_function`) only covers
  // ACTIVE rows, so a name collision cannot occur when this row is being deactivated.
  // Blocking submission here would also make pre-existing duplicate active rows
  // (which the index migration may have found in production data) unfixable through
  // the UI, since deactivating one of them is the normal way to resolve the conflict.
  const willBeActive = !isEdit || formik.values.isActive;
  const duplicate =
    willBeActive &&
    isDuplicateDesignationName(
      formik.values.designation,
      resolvedCareerFunctionIdForCheck,
      allDesignations,
      designation?.id,
    );

  const nameError = duplicate
    ? "An active designation with this name already exists in this career function."
    : formik.touched.designation && formik.errors.designation;

  // Same reasoning as CareerFunctionDialog: gate on the current switch value so an
  // already-inactive designation that still holds active employees can be reactivated.
  const cannotDeactivate =
    isEdit && Boolean(designation?.activeEmployeeCount) && formik.values.isActive;
  const activeCount = designation?.activeEmployeeCount ?? 0;
  const employeeWord = `employee${activeCount === 1 ? "" : "s"}`;
  const deactivateTooltip = cannotDeactivate
    ? `This designation has ${activeCount} active ${employeeWord} and cannot be deactivated.`
    : "";

  // Active career functions, plus this designation's OWN career function even when it is
  // inactive. Without that exception, editing a designation whose parent has been retired
  // would drop the current value from the Select and silently unassign it on save. Other
  // inactive career functions stay out, so a designation still cannot be moved INTO a
  // retired one — you can keep where you are, but not move somewhere retired.
  const selectableCareerFunctions = useMemo(() => {
    const options = careerFunctions.filter((cf) => cf.isActive);
    const currentId = designation?.careerFunctionId;
    if (currentId != null && !options.some((cf) => cf.id === currentId)) {
      const current = careerFunctions.find((cf) => cf.id === currentId);
      if (current) options.push(current);
    }
    return options.sort((a, b) => a.careerFunction.localeCompare(b.careerFunction));
  }, [careerFunctions, designation]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? `Edit Designation: ${designation?.designation}` : "Add Designation"}
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
            <BaseTextField
              label="Designation Name"
              isRequired
              id="designation"
              name="designation"
              value={formik.values.designation}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(nameError)}
              helperText={nameError || undefined}
            />
            <BaseTextField
              label="Job Band"
              id="jobBand"
              name="jobBand"
              type="number"
              value={formik.values.jobBand}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.jobBand && Boolean(formik.errors.jobBand)}
              helperText={formik.touched.jobBand && formik.errors.jobBand}
            />
            <BaseTextField
              select
              isRequired
              label="Career Function"
              id="careerFunctionId"
              name="careerFunctionId"
              value={formik.values.careerFunctionId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.careerFunctionId && Boolean(formik.errors.careerFunctionId)}
              helperText={formik.touched.careerFunctionId && formik.errors.careerFunctionId}
            >
              {selectableCareerFunctions.map((cf) => (
                <MenuItem key={cf.id} value={String(cf.id)}>
                  {cf.careerFunction}
                </MenuItem>
              ))}
            </BaseTextField>
            {isEdit && (
              <FormControlLabel
                control={
                  <Tooltip title={deactivateTooltip} arrow placement="top">
                    <span>
                      <Switch
                        id="isActive"
                        name="isActive"
                        checked={formik.values.isActive}
                        onChange={formik.handleChange}
                        disabled={cannotDeactivate}
                        sx={{
                          ...(cannotDeactivate && { opacity: 0.5 }),
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: theme.palette.secondary.contrastText,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: theme.palette.secondary.contrastText,
                          },
                        }}
                      />
                    </span>
                  </Tooltip>
                }
                label={formik.values.isActive ? "Active" : "Inactive"}
                sx={cannotDeactivate ? { "& .MuiFormControlLabel-label": { opacity: 0.6 } } : undefined}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={
              formik.isSubmitting ||
              !formik.dirty ||
              duplicate ||
              formik.values.careerFunctionId === UNASSIGNED_VALUE
            }
            startIcon={formik.isSubmitting ? <CircularProgress size={16} /> : null}
            sx={{ textTransform: "none" }}
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
