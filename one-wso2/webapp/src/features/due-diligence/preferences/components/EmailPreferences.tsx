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
import { Alert, Button, Chip, Snackbar, Stack, TextField } from "@wso2/oxygen-ui";
import { UserRoundIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import {
  useAddNotificationEmail,
  useDeleteNotificationEmail,
  useNotificationEmails,
} from "../api/usePreferences";

// Same validation regex as the source's Preferences/EmailPreferences.js.
const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function EmailPreferences() {
  const emails = useNotificationEmails();
  const addEmail = useAddNotificationEmail();
  const deleteEmail = useDeleteNotificationEmail();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const add = () => {
    if (email === "") {
      setError("Please enter an email");
      return;
    }
    if (!EMAIL_RE.test(email.toLowerCase())) {
      setError("Please enter a valid email");
      return;
    }
    if (emails.data?.includes(email)) {
      setError("Already exists");
      return;
    }
    addEmail.mutate(email, {
      onSuccess: () => {
        setEmail("");
        setSnack({ open: true, severity: "success", message: "Email added" });
      },
      onError: (err) => setSnack({ open: true, severity: "error", message: `Couldn't add. ${humanizeHttpError(err)}` }),
    });
  };

  const remove = (target: string) => {
    deleteEmail.mutate(target, {
      onSuccess: () => setSnack({ open: true, severity: "success", message: "Email removed" }),
      onError: (err) => setSnack({ open: true, severity: "error", message: `Couldn't remove. ${humanizeHttpError(err)}` }),
    });
  };

  return (
    <Stack spacing={1.5}>
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <TextField
          label="Email Address"
          size="small"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          error={Boolean(error)}
          helperText={error}
          sx={{ maxWidth: 320 }}
        />
        <Button variant="contained" onClick={add} disabled={addEmail.isPending} sx={{ textTransform: "none" }}>
          Add
        </Button>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        {emails.data?.map((e) => (
          <Chip
            key={e}
            icon={<UserRoundIcon size={14} />}
            label={e}
            variant="outlined"
            color="primary"
            onDelete={() => remove(e)}
            deleteIcon={<XIcon size={14} />}
          />
        ))}
      </Stack>
    </Stack>
  );
}
