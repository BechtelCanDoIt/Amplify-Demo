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

import type { ReactNode } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@wso2/oxygen-ui";

// Confirm an opt-in or an opt-out.
//
// Worth a dialog rather than a bare button because both directions are
// month-scale commitments that cannot simply be clicked back: an opt-in bills
// the employee for the month, and an opt-out can only be reversed once the
// OTHER window comes round. `detail` is where that gets said — the caller
// passes the reverse window, so the dialog answers "and what if I change my
// mind?" before it is asked.
export default function ConfirmSubscriptionDialog({
  open,
  title,
  detail,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  /** The question, in full: "Opt in to LaaS?" */
  title: string;
  /** The consequence — the price, the reverse window, or whose account it is. */
  detail?: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      // Not closable mid-flight: the request is already on its way, and a
      // dialog that vanishes on a stray backdrop click leaves the user unsure
      // whether it went through.
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof detail === "string" ? (
          <Typography variant="body2" color="text.secondary">
            {detail}
          </Typography>
        ) : (
          detail
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
