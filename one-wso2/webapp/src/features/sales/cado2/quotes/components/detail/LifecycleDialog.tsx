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

import { useState, type JSX, type ReactNode } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";

const MAX_REASON = 2000;

interface LifecycleDialogProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly confirmLabel: string;
  /** "required" or "optional" shows a reason box; omit it for none. */
  readonly reason?: "required" | "optional";
  readonly reasonLabel?: string;
  readonly danger?: boolean;
  readonly pending: boolean;
  readonly error: Error | null;
  readonly onConfirm: (reason: string) => void;
  readonly onClose: () => void;
}

/**
 * Confirms a lifecycle action: Recall (optional reason), Revise (no
 * reason) or Close (required reason). Mounted only while open, so the reason
 * starts empty every time.
 */
export default function LifecycleDialog({
  title,
  children,
  confirmLabel,
  reason,
  reasonLabel = "Reason",
  danger = false,
  pending,
  error,
  onConfirm,
  onClose,
}: LifecycleDialogProps): JSX.Element {
  const [text, setText] = useState("");
  const missing = reason === "required" && text.trim() === "";
  const tooLong = text.length > MAX_REASON;

  return (
    <Dialog open onClose={() => !pending && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" component="div">
            {children}
          </Typography>
          {reason ? (
            <TextField
              label={reason === "required" ? reasonLabel : `${reasonLabel} (optional)`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              multiline
              minRows={2}
              required={reason === "required"}
              error={tooLong}
              helperText={tooLong ? `At most ${MAX_REASON} characters` : undefined}
              autoFocus
            />
          ) : null}
          {error ? <ErrorNotice error={error}>That didn&apos;t work.</ErrorNotice> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={danger ? "error" : "primary"}
          onClick={() => onConfirm(text.trim())}
          disabled={pending || missing || tooLong}
        >
          {pending ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
