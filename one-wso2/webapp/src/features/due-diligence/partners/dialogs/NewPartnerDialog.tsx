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

import { useState } from "react";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { PlusCircleIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { useDueDiligenceAppConfig } from "@features/due-diligence/api/useDueDiligenceAppConfig";
import { useCountries, useCreatePartnerLink } from "../api/usePartners";

const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// `autoComplete="off"` alone doesn't stop Chrome/WebKit from autofilling an
// email-shaped field anyway — it just ignores the hint. This overrides the
// forced `-webkit-autofill` background WebKit paints regardless, using the
// live CSS variables (not `theme.palette.*`, which is frozen at first paint
// under this app's CssVarsProvider setup) so it still
// matches the field's real background/text color in both themes.
const AUTOFILL_SELECTORS = [
  "& input:-webkit-autofill",
  "& input:-webkit-autofill:hover",
  "& input:-webkit-autofill:focus",
  "& input:-webkit-autofill:active",
].join(", ");
const NO_AUTOFILL_SX = {
  [AUTOFILL_SELECTORS]: {
    WebkitBoxShadow: "0 0 0 1000px var(--oxygen-palette-background-paper) inset !important",
    WebkitTextFillColor: "var(--oxygen-palette-text-primary) !important",
    caretColor: "var(--oxygen-palette-text-primary) !important",
    transition: "background-color 9999s ease-in-out 0s !important",
  },
} as const;

// A direct port of the source app's RegionSelect.js's hardcoded region list
// — these ids are what the backend's PartnerLink.regionId expects, not
// derived from any endpoint.
const REGIONS = [
  { id: 1, title: "North America" },
  { id: 2, title: "LATAM" },
  { id: 3, title: "Middle East" },
  { id: 4, title: "ANZ" },
  { id: 5, title: "UK" },
  { id: 6, title: "EU" },
  { id: 7, title: "Asia" },
  { id: 8, title: "Africa" },
] as const;

/**
 * Ported from the source app's Dialog/NewResellerDialog.js — creates a new
 * partner invitation link. The partner form link is automatically emailed
 * to the contact email(s); the channel manager gets a confirmation email
 * (both handled server-side by POST /partner/link).
 */
export default function NewPartnerDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const appConfig = useDueDiligenceAppConfig();
  const countries = useCountries();
  const createLink = useCreatePartnerLink();

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [emails, setEmails] = useState<string[]>([""]);
  const [countryId, setCountryId] = useState<number | "">("");
  const [regionId, setRegionId] = useState<number | "">("");
  const [errors, setErrors] = useState<{
    companyName?: boolean;
    contactName?: boolean;
    emails?: boolean;
    invalidEmails?: boolean;
    country?: boolean;
    region?: boolean;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const setEmailAt = (index: number, value: string) => {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  };
  const removeEmailAt = (index: number) => setEmails((prev) => prev.filter((_, i) => i !== index));

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (companyName === "") next.companyName = true;
    if (contactName === "") next.contactName = true;
    if (emails.some((e) => e === "")) next.emails = true;
    if (emails.some((e) => !EMAIL_RE.test(e.toLowerCase()))) next.invalidEmails = true;
    if (countryId === "") next.country = true;
    if (regionId === "") next.region = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    // Without this, clicking "Add Partner" before /app-config has resolved
    // silently submits an empty clientUrl — the backend uses it to build the
    // partner's own invitation link, so an empty value produces a broken
    // link with no error shown to the admin.
    if (!appConfig.data?.clientBaseUrl) {
      setServerError("Configuration is still loading. Please try again in a moment.");
      return;
    }
    setServerError(null);
    createLink.mutate(
      {
        contactEmails: emails,
        companyName,
        contactName,
        clientUrl: appConfig.data.clientBaseUrl,
        regionId: regionId as number,
        countryId: countryId as number,
      },
      {
        onSuccess: onCreated,
        onError: (err) => setServerError(humanizeHttpError(err)),
      },
    );
  };

  return (
    <>
      <Backdrop open={createLink.isPending} sx={{ zIndex: (t) => t.zIndex.modal + 1, color: "white" }}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Dialog open fullWidth onClose={onClose}>
        <DialogTitle>Request Form</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Please enter the following details</DialogContentText>
          <Stack spacing={2}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <TextField
              autoFocus
              required
              label="Partner Company Name"
              variant="outlined"
              fullWidth
              autoComplete="off"
              sx={NO_AUTOFILL_SX}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              error={Boolean(errors.companyName)}
              helperText={errors.companyName ? "Please enter Company Name" : undefined}
            />
            <TextField
              required
              label="Partner Contact Name"
              variant="outlined"
              fullWidth
              autoComplete="off"
              sx={NO_AUTOFILL_SX}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              error={Boolean(errors.contactName)}
              helperText={errors.contactName ? "Please enter Contact Name" : undefined}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Country
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={countryId}
                  onChange={(e) => { const v = e.target.value as unknown; setCountryId(v === "" ? "" : Number(v)); }}
                  error={Boolean(errors.country)}
                >
                  {countries.data?.map((c) => (
                    <MenuItem key={c.countryId} value={c.countryId}>
                      {c.countryName}
                    </MenuItem>
                  ))}
                </Select>
                {errors.country && (
                  <Typography variant="body2" color="error">
                    Please select a country
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Region
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={regionId}
                  onChange={(e) => { const v = e.target.value as unknown; setRegionId(v === "" ? "" : Number(v)); }}
                  error={Boolean(errors.region)}
                >
                  {REGIONS.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.title}
                    </MenuItem>
                  ))}
                </Select>
                {errors.region && (
                  <Typography variant="body2" color="error">
                    Please select a region
                  </Typography>
                )}
              </Box>
            </Box>

            {emails.map((email, index) => {
              const isLast = index === emails.length - 1;
              return (
                <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    required
                    label={`Contact Email ${index + 1}`}
                    variant="outlined"
                    fullWidth
                    // Stops the browser's own autofill (and its jarring native
                    // blue highlight) from taking over this field — every entry
                    // here is a NEW address the caller types, not a saved one.
                    autoComplete="off"
                    sx={NO_AUTOFILL_SX}
                    value={email}
                    onChange={(e) => setEmailAt(index, e.target.value)}
                    error={Boolean(errors.emails) || Boolean(errors.invalidEmails)}
                  />
                  {isLast && (
                    <IconButton aria-label="add email" onClick={() => setEmails((prev) => [...prev, ""])}>
                      <PlusCircleIcon size={18} />
                    </IconButton>
                  )}
                  {emails.length > 1 && (
                    <IconButton aria-label="remove email" onClick={() => removeEmailAt(index)}>
                      <XIcon size={16} />
                    </IconButton>
                  )}
                </Stack>
              );
            })}
            {errors.invalidEmails && (
              <Typography variant="body2" color="error">
                Please enter a valid email
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary">
              Partner form link will be automatically sent to the partner contact email, and the channel manager will
              receive a confirmation email.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={submit} disabled={createLink.isPending}>
            Add Partner
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
