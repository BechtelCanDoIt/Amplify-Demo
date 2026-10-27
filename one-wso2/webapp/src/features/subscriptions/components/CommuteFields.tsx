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

import { Box, MenuItem, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import type { DistanceOption } from "../api/subscriptionTypes";
import { CONTACT_NUMBER_HINT, isValidContactNumber } from "../util/contactNumber";

// The two things a commute opt-in needs: how far the ride is (which sets the
// price) and the number the driver calls. LaaS has neither, which is why they
// live here rather than in the card.
//
// Shared by the self-service card and the admin panel unchanged. The rules are
// identical in both — an admin subscribing on someone's behalf sends the same
// payload through the same constraint — so the only difference is whose number
// is being typed.
//
// The price is shown on the option itself rather than in a separate line
// underneath. Distance is not what anyone is choosing; the cost is, and
// putting the two together makes the list a price list instead of a quiz about
// one's own commute.

export interface CommuteFieldsState {
  distanceRangeId: number | "";
  contactNumber: string;
}

export function commuteFieldsValid(state: CommuteFieldsState): boolean {
  return state.distanceRangeId !== "" && isValidContactNumber(state.contactNumber);
}

export default function CommuteFields({
  options,
  value,
  onChange,
  disabled,
  /** Show validation errors only once the user has tried to submit — a form
   *  that turns red before it has been used is scolding, not helping. */
  showErrors = false,
}: {
  options: DistanceOption[];
  value: CommuteFieldsState;
  onChange: (next: CommuteFieldsState) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const contactInvalid = showErrors && !isValidContactNumber(value.contactNumber);
  const distanceMissing = showErrors && value.distanceRangeId === "";

  return (
    <Stack spacing={2} sx={{ mt: 0.5 }}>
      <TextField
        select
        label="Distance from home to office"
        size="small"
        value={value.distanceRangeId === "" ? "" : String(value.distanceRangeId)}
        onChange={(e) =>
          onChange({
            ...value,
            distanceRangeId: e.target.value === "" ? "" : Number(e.target.value),
          })
        }
        disabled={disabled || options.length === 0}
        error={distanceMissing}
        helperText={
          distanceMissing
            ? "Choose the band your commute falls into."
            : options.length === 0
              ? "No distance bands are configured yet."
              : "The band sets the monthly rate."
        }
        fullWidth
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={String(option.value)}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                width: "100%",
              }}
            >
              <span>{option.label}</span>
              <Typography component="span" variant="body2" color="text.secondary">
                {option.cost}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Contact number"
        size="small"
        placeholder="+94771234567"
        value={value.contactNumber}
        onChange={(e) => onChange({ ...value, contactNumber: e.target.value })}
        disabled={disabled}
        error={contactInvalid}
        // The hint names the shape at all times, so the error state adds a
        // reason rather than being the first time the format is mentioned.
        helperText={
          contactInvalid
            ? `That doesn't look right. ${CONTACT_NUMBER_HINT}`
            : CONTACT_NUMBER_HINT
        }
        // Tells a phone keyboard to offer digits and a "+".
        slotProps={{ htmlInput: { inputMode: "tel", maxLength: 12 } }}
        fullWidth
      />
    </Stack>
  );
}
