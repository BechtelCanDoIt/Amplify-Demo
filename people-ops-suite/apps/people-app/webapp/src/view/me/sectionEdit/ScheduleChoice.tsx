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
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useState } from "react";

/** What the admin chose to do with the edit they just made. */
export type ScheduleSelection =
  { mode: "now" } | { mode: "scheduled"; effectiveDate: string };

/**
 * When an edit should take effect, asked inside the confirmation dialog.
 *
 * Applying now is the default and the unchanged path: the choice only appears once
 * somebody looks for it, so the common case still reads as a plain confirmation.
 */
const ScheduleChoice = ({
  pendingConflicts,
  onChange,
}: {
  /**
   * Labels of fields in this edit that already have a change queued. Shown as a
   * warning rather than a block: two changes to one field are allowed and apply in
   * date order, but nobody should discover the earlier one afterwards.
   */
  pendingConflicts: string[];
  onChange: (selection: ScheduleSelection) => void;
}) => {
  const [mode, setMode] = useState<"now" | "scheduled">("now");
  const [date, setDate] = useState<string | null>(null);

  const emit = (nextMode: "now" | "scheduled", nextDate: string | null) => {
    onChange(
      nextMode === "now"
        ? { mode: "now" }
        : { mode: "scheduled", effectiveDate: nextDate ?? "" },
    );
  };

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
          mb: 0.5,
        }}
      >
        When
      </Typography>

      <RadioGroup
        value={mode}
        onChange={(e) => {
          const next = e.target.value as "now" | "scheduled";
          setMode(next);
          emit(next, date);
        }}
      >
        <FormControlLabel
          value="now"
          control={<Radio size="small" />}
          label={<Typography sx={{ fontSize: 14 }}>Apply now</Typography>}
        />
        <FormControlLabel
          value="scheduled"
          control={<Radio size="small" />}
          label={<Typography sx={{ fontSize: 14 }}>Apply on a date</Typography>}
        />
      </RadioGroup>

      {mode === "scheduled" && (
        <Box sx={{ mt: 1, ml: 3.75 }}>
          <DatePicker
            label="Effective date"
            format="YYYY-MM-DD"
            value={date ? dayjs(date) : null}
            // Tomorrow at the earliest. Today would either be applied by a sweep
            // that has not run yet or missed by one that already has, so the date it
            // takes effect would depend on the time of day it was scheduled.
            minDate={dayjs().add(1, "day")}
            onChange={(v: dayjs.Dayjs | null) => {
              const next = v ? v.format("YYYY-MM-DD") : null;
              setDate(next);
              emit("scheduled", next);
            }}
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                helperText:
                  "The record is unchanged until this date, when the change is applied automatically.",
              },
            }}
          />
        </Box>
      )}

      {pendingConflicts.length > 0 && (
        <Typography
          sx={{
            fontSize: 12.5,
            mt: 1.5,
            color: "warning.main",
            fontWeight: 500,
          }}
        >
          {pendingConflicts.join(", ")}
          {pendingConflicts.length === 1 ? " already has" : " already have"} a
          change scheduled. Both will apply, in date order.
        </Typography>
      )}
    </Box>
  );
};

export default ScheduleChoice;
