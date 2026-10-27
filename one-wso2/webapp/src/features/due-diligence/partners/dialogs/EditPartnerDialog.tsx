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
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { PlusCircleIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { useDueDiligenceAppConfig } from "@features/due-diligence/api/useDueDiligenceAppConfig";
import { useResendPartnerLinkEmail } from "../api/usePartners";

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

export interface EditPartnerTarget {
  linkId: number;
  companyName: string;
  emails: string[];
  contactName: string;
  channelManagerEmail: string;
}

/**
 * Ported from the source app's Dialog/EditResellerDialog.js — edits a
 * partner link's company/contact/channel-manager details and resends the
 * partner form link + channel-manager confirmation email.
 */
export default function EditPartnerDialog({
  target,
  onClose,
  onSaved,
}: {
  target: EditPartnerTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const appConfig = useDueDiligenceAppConfig();
  const resendEmail = useResendPartnerLinkEmail();

  const [companyName, setCompanyName] = useState(target.companyName);
  const [contactName, setContactName] = useState(target.contactName);
  const [emails, setEmails] = useState<string[]>(target.emails.length > 0 ? target.emails : [""]);
  const [channelManagerEmail, setChannelManagerEmail] = useState(target.channelManagerEmail);
  const [errors, setErrors] = useState<{
    companyName?: boolean;
    contactName?: boolean;
    emails?: boolean;
    invalidEmails?: boolean;
    channelManagerEmail?: boolean;
    invalidChannelManagerEmail?: boolean;
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
    if (channelManagerEmail === "") next.channelManagerEmail = true;
    else if (!EMAIL_RE.test(channelManagerEmail.toLowerCase())) next.invalidChannelManagerEmail = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    setServerError(null);
    resendEmail.mutate(
      {
        linkId: target.linkId,
        emails,
        companyName,
        contactName,
        channelManagerEmail,
        clientUrl: appConfig.data?.clientBaseUrl ?? "",
      },
      {
        onSuccess: onSaved,
        onError: (err) => setServerError(humanizeHttpError(err)),
      },
    );
  };

  return (
    <>
      <Backdrop open={resendEmail.isPending} sx={{ zIndex: (t) => t.zIndex.modal + 1, color: "white" }}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Dialog open fullWidth onClose={onClose}>
        <DialogTitle>Reseller Details</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>The following details may be edited</DialogContentText>
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

            {emails.map((email, index) => {
              const isLast = index === emails.length - 1;
              return (
                <Stack key={index} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    required
                    label={`Contact Email ${index + 1}`}
                    variant="outlined"
                    fullWidth
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

            <TextField
              required
              label="Channel Manager Email"
              variant="outlined"
              fullWidth
              autoComplete="off"
              sx={NO_AUTOFILL_SX}
              value={channelManagerEmail}
              onChange={(e) => setChannelManagerEmail(e.target.value)}
              error={Boolean(errors.channelManagerEmail) || Boolean(errors.invalidChannelManagerEmail)}
              helperText={
                errors.channelManagerEmail
                  ? "Please enter Channel Manager Email"
                  : errors.invalidChannelManagerEmail
                    ? "Please enter a valid email"
                    : undefined
              }
            />
            <Typography variant="body2" color="text.secondary">
              The partner form link will be automatically sent to the partner contact email, and the channel manager
              will receive a confirmation email.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={save} disabled={resendEmail.isPending}>
            Save Edit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
