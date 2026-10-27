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
  Grid,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useState } from "react";

import {
  fetchEmployee,
  updateResignation,
} from "@slices/employeeSlice/employee";
import { fetchEmployeeHistory } from "@slices/employeeSlice/employeeHistory";
import { useAppDispatch } from "@slices/store";
import {
  RESIGNATION_DATE_ORDER_MESSAGE,
  isResignationDateOrderValid,
} from "@utils/utils";

import ResignationReasonField from "@view/me/sectionEdit/ResignationReasonField";

/**
 * Records a departure for an employee who is still active.
 *
 * Only the three resignation details are asked for. Employment status is not offered:
 * recording a departure is what makes someone a leaver, so the backend sets "Marked
 * leaver" as a consequence. A caller holding only the resignation permission therefore
 * cannot set an arbitrary status.
 *
 * Correcting an already-recorded departure is a different job, handled by the
 * Resignation Details section rather than here.
 */
const ResignEmployeeDialog = ({
  open,
  employeeId,
  employeeName,
  onClose,
}: {
  open: boolean;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const [finalDayInOffice, setFinalDayInOffice] = useState<string | null>(null);
  const [finalDayOfEmployment, setFinalDayOfEmployment] = useState<
    string | null
  >(null);
  const [resignationReason, setResignationReason] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const missing = {
    finalDayInOffice: !finalDayInOffice,
    finalDayOfEmployment: !finalDayOfEmployment,
    resignationReason: !resignationReason?.trim(),
  };
  const hasMissing = Object.values(missing).some(Boolean);
  // Employment cannot end before someone stops coming in; the same day is valid.
  const isDateOrderInvalid = !isResignationDateOrderValid(
    finalDayInOffice,
    finalDayOfEmployment,
  );
  const canSubmit = !hasMissing && !isDateOrderInvalid;

  const reset = () => {
    setFinalDayInOffice(null);
    setFinalDayOfEmployment(null);
    setResignationReason(null);
    setTouched(false);
  };

  const handleClose = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const result = await dispatch(
        updateResignation({
          employeeId,
          payload: {
            finalDayInOffice: finalDayInOffice as string,
            finalDayOfEmployment: finalDayOfEmployment as string,
            resignationReason: (resignationReason ?? "").trim(),
          },
        }),
      );
      if (updateResignation.rejected.match(result)) return;

      // Re-read so the header chip and the newly-visible Resignation Details section
      // reflect what was actually persisted.
      await dispatch(fetchEmployee(employeeId));
      // Resigning writes employment status and the resignation details, so the field
      // history beside them is re-read for the same reason a section save does it.
      dispatch(fetchEmployeeHistory(employeeId));
      reset();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const date = (
    label: string,
    value: string | null,
    onChange: (v: string | null) => void,
    isMissing: boolean,
    orderError?: boolean,
    // Only the final day of employment passes this, held at or after the last day in
    // office, so the impossible half of the calendar cannot be picked. The order is
    // still validated below and again on the server.
    minDate?: dayjs.Dayjs,
  ) => (
    <DatePicker
      label={`${label} *`}
      format="YYYY-MM-DD"
      value={value ? dayjs(value) : null}
      minDate={minDate}
      disabled={isSaving}
      onChange={(v: dayjs.Dayjs | null) =>
        onChange(v ? v.format("YYYY-MM-DD") : null)
      }
      slotProps={{
        field: { clearable: true },
        textField: {
          size: "small",
          fullWidth: true,
          error: (touched && isMissing) || Boolean(orderError),
          helperText: orderError
            ? RESIGNATION_DATE_ORDER_MESSAGE
            : touched && isMissing
              ? `${label} is required`
              : undefined,
        },
      }}
    />
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Resign employee</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ fontSize: 14, mb: 2.5 }}>
          Recording these details marks{" "}
          <Box component="span" sx={{ fontWeight: 600 }}>
            {employeeName}
          </Box>{" "}
          as a leaver.
        </Typography>
        <Grid container rowSpacing={2.5} columnSpacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            {date(
              "Last Day in Office",
              finalDayInOffice,
              setFinalDayInOffice,
              missing.finalDayInOffice,
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            {date(
              "Final Day of Employment",
              finalDayOfEmployment,
              setFinalDayOfEmployment,
              missing.finalDayOfEmployment,
              isDateOrderInvalid,
              finalDayInOffice ? dayjs(finalDayInOffice) : undefined,
            )}
          </Grid>
          <Grid item xs={12}>
            <ResignationReasonField
              value={resignationReason}
              disabled={isSaving}
              error={touched && missing.resignationReason}
              helperText={
                touched && missing.resignationReason
                  ? "Resignation reason is required"
                  : undefined
              }
              onChange={setResignationReason}
              onBlur={() => undefined}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={handleClose}
          disabled={isSaving}
          sx={{ textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSubmit}
          disabled={isSaving || isDateOrderInvalid}
          startIcon={
            isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
          sx={{ textTransform: "none" }}
        >
          {isSaving ? "Saving..." : "Resign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResignEmployeeDialog;
