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
  Switch,
  Tooltip,
  useTheme,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BaseTextField } from "@component/common/FieldInput/BasicFieldInput/BaseTextField";
import {
  CareerFunction,
  CreateCareerFunctionPayload,
  UpdateCareerFunctionPayload,
} from "@slices/careerFunctionSlice/careerFunction";
import { isDuplicateCareerFunctionName } from "./duplicateDesignation.utils";

interface CareerFunctionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCareerFunctionPayload | UpdateCareerFunctionPayload) => Promise<void>;
  careerFunction?: CareerFunction | null;
  allCareerFunctions: CareerFunction[];
}

const validationSchema = Yup.object({
  careerFunction: Yup.string()
    .trim()
    .required("Name is required")
    .max(150, "Name must be at most 150 characters"),
});

export default function CareerFunctionDialog({
  open,
  onClose,
  onSubmit,
  careerFunction,
  allCareerFunctions,
}: CareerFunctionDialogProps) {
  const theme = useTheme();
  const isEdit = careerFunction != null;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      careerFunction: careerFunction?.careerFunction ?? "",
      isActive: careerFunction?.isActive ?? true,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      const payload = isEdit
        ? ({
            careerFunction: values.careerFunction,
            isActive: values.isActive,
          } satisfies UpdateCareerFunctionPayload)
        : ({
            careerFunction: values.careerFunction,
          } satisfies CreateCareerFunctionPayload);
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

  // A career function name is unique across the whole table, active or not, matching the
  // uk_career_function_name index. The backend still returns 400 for the same condition;
  // this check just avoids a round-trip for the common case.
  const duplicate = isDuplicateCareerFunctionName(
    formik.values.careerFunction,
    allCareerFunctions,
    careerFunction?.id,
  );
  const nameError = duplicate
    ? "A career function with this name already exists."
    : formik.touched.careerFunction && formik.errors.careerFunction;

  // Deactivation is gated on active employees only. Active-but-unstaffed designations do
  // not block it — see the matching comment on PATCH /career-functions in service.bal.
  const activeCount = careerFunction?.activeEmployeeCount ?? 0;
  // Gate on the CURRENT switch value so this blocks only the active -> inactive
  // transition. activeEmployeeCount is independent of isActive, so without the last
  // clause an already-inactive career function holding active employees would have a
  // permanently disabled switch and could never be reactivated here.
  const cannotDeactivate = isEdit && activeCount > 0 && formik.values.isActive;
  const employeeWord = `employee${activeCount === 1 ? "" : "s"}`;
  const deactivateTooltip = cannotDeactivate
    ? `This career function has ${activeCount} active ${employeeWord} and cannot be deactivated.`
    : "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? `Edit Career Function: ${careerFunction?.careerFunction}` : "Add Career Function"}
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
            <BaseTextField
              label="Career Function Name"
              isRequired
              id="careerFunction"
              name="careerFunction"
              value={formik.values.careerFunction}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(nameError)}
              helperText={nameError}
            />
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
            disabled={formik.isSubmitting || !formik.dirty || duplicate}
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
