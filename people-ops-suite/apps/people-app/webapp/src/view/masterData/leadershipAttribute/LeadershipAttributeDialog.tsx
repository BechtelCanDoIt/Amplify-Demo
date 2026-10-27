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
  CreateLeadershipGroupPayload,
  LeadershipGroupWithUsage,
  UpdateLeadershipGroupPayload,
} from "@slices/leadershipSlice/leadership";
import {
  LEADERSHIP_ATTRIBUTE_NAME_PATTERN,
  LEADERSHIP_ATTRIBUTE_NAME_RULE,
  isDuplicateLeadershipAttributeName,
  isRetireBlocked,
} from "./leadershipAttribute.utils";

interface LeadershipAttributeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateLeadershipGroupPayload | UpdateLeadershipGroupPayload,
  ) => Promise<void>;
  attribute?: LeadershipGroupWithUsage | null;
  allAttributes: LeadershipGroupWithUsage[];
}

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Name is required")
    .max(100, "Name must be at most 100 characters")
    // The backend applies the same rule; see LEADERSHIP_ATTRIBUTE_NAME_PATTERN.
    .matches(LEADERSHIP_ATTRIBUTE_NAME_PATTERN, LEADERSHIP_ATTRIBUTE_NAME_RULE),
});

export default function LeadershipAttributeDialog({
  open,
  onClose,
  onSubmit,
  attribute,
  allAttributes,
}: LeadershipAttributeDialogProps) {
  const theme = useTheme();
  const isEdit = attribute != null;

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: attribute?.name ?? "",
      isActive: attribute?.isActive ?? true,
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      // Only changed fields are sent, so a rename never carries an isActive that could
      // trip the retire guard, and a status change never rewrites the name.
      const payload: CreateLeadershipGroupPayload | UpdateLeadershipGroupPayload =
        isEdit
          ? {
              ...(values.name.trim() !== attribute?.name && {
                name: values.name,
              }),
              ...(values.isActive !== attribute?.isActive && {
                isActive: values.isActive,
              }),
            }
          : { name: values.name };
      // A whitespace-only edit to the name leaves nothing to send.
      if (Object.keys(payload).length === 0) {
        onClose();
        setSubmitting(false);
        return;
      }
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

  const duplicate = isDuplicateLeadershipAttributeName(
    formik.values.name,
    allAttributes,
    attribute?.id,
  );
  const nameError = duplicate
    ? "A leadership attribute with this name already exists."
    : formik.touched.name && formik.errors.name;

  // Gated on the CURRENT switch value so only the active -> retired transition is
  // blocked; a retired attribute can always be reactivated.
  const cannotRetire = isRetireBlocked(attribute, formik.values.isActive);
  const holderCount = attribute?.holderCount ?? 0;
  const retireTooltip = cannotRetire
    ? `Held by ${holderCount} current employee${holderCount === 1 ? "" : "s"}. ` +
      "Remove it from them before retiring it."
    : "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit
          ? `Edit Leadership Attribute: ${attribute?.name}`
          : "Add Leadership Attribute"}
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}
          >
            <BaseTextField
              label="Leadership Attribute Name"
              isRequired
              id="name"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(nameError)}
              helperText={
                nameError ||
                (isEdit
                  ? "Renaming updates it on every holder's profile, the reports and the CSV column."
                  : undefined)
              }
            />
            {isEdit && (
              <FormControlLabel
                control={
                  <Tooltip title={retireTooltip} arrow placement="top">
                    <span>
                      <Switch
                        id="isActive"
                        name="isActive"
                        checked={formik.values.isActive}
                        onChange={formik.handleChange}
                        disabled={cannotRetire}
                        sx={{
                          ...(cannotRetire && { opacity: 0.5 }),
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: theme.palette.secondary.contrastText,
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                            {
                              backgroundColor:
                                theme.palette.secondary.contrastText,
                            },
                        }}
                      />
                    </span>
                  </Tooltip>
                }
                label={formik.values.isActive ? "Active" : "Retired"}
                sx={
                  cannotRetire
                    ? { "& .MuiFormControlLabel-label": { opacity: 0.6 } }
                    : undefined
                }
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={formik.isSubmitting || !formik.dirty || duplicate}
            startIcon={
              formik.isSubmitting ? <CircularProgress size={16} /> : null
            }
            sx={{ textTransform: "none" }}
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
