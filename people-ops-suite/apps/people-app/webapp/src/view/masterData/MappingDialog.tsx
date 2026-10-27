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
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import EmployeeEmailSelect from "@component/EmployeeEmailSelect/EmployeeEmailSelect";
import { CompanyOrgChartEntity } from "@slices/masterDataSlice/masterData";

export type MappingLevel = "team" | "sub-team" | "unit";

interface MappingDialogProps {
  open: boolean;
  onClose: () => void;
  level: MappingLevel;
  parentLabel: string;
  availableEntities: CompanyOrgChartEntity[];
  onSubmit: (entityId: number, headEmail: string) => Promise<void>;
}

const validationSchema = Yup.object({
  entityId: Yup.number()
    .required("Please select an entity")
    .positive("Please select an entity"),
  headEmail: Yup.string().nullable(),
});

const LEVEL_LABEL: Record<MappingLevel, string> = {
  team: "Team",
  "sub-team": "Sub-team",
  unit: "Unit",
};

export default function MappingDialog({
  open,
  onClose,
  level,
  parentLabel,
  availableEntities,
  onSubmit,
}: MappingDialogProps) {
  const entityLabel = LEVEL_LABEL[level];

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      entityId: 0,
      entityOption: null as CompanyOrgChartEntity | null,
      headEmail: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        await onSubmit(values.entityId, values.headEmail);
        resetForm();
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add {entityLabel} to {parentLabel}
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
            <Autocomplete
              options={availableEntities}
              getOptionLabel={(option) => option.name}
              value={formik.values.entityOption}
              onChange={(_, value) => {
                formik.setFieldValue("entityOption", value);
                formik.setFieldValue("entityId", value?.id ?? 0);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`Select ${entityLabel} *`}
                  error={formik.touched.entityId && formik.values.entityId === 0}
                  helperText={
                    formik.touched.entityId && formik.values.entityId === 0
                      ? `Please select a ${entityLabel.toLowerCase()}`
                      : ""
                  }
                  variant="outlined"
                  sx={{
                    "& .MuiInputLabel-root": { fontSize: 15 },
                    "& .MuiFormHelperText-root": { fontSize: 14 },
                  }}
                  inputProps={{ ...params.inputProps, style: { fontSize: 15 } }}
                  InputLabelProps={{ ...params.InputLabelProps, style: { fontSize: 15 } }}
                />
              )}
            />
            <EmployeeEmailSelect
              mode="single"
              label="Functional Head Email"
              value={formik.values.headEmail}
              onChange={(email) => formik.setFieldValue("headEmail", email)}
              onBlur={() => formik.setFieldTouched("headEmail", true)}
              error={formik.touched.headEmail && Boolean(formik.errors.headEmail)}
              helperText={formik.touched.headEmail && formik.errors.headEmail}
            />
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
            disabled={formik.isSubmitting || formik.values.entityId === 0}
            startIcon={formik.isSubmitting ? <CircularProgress size={16} /> : null}
            sx={{ textTransform: "none" }}
          >
            Assign
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
