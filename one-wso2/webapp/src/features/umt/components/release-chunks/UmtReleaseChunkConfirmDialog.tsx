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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@wso2/oxygen-ui";

// The confirmation step shared by every release-chunk action that reaches
// outside this screen: sending the status email, scheduling test builds,
// retriggering the CST or docker builds, and releasing the chunk itself. All
// five differ only in their wording, so they share one dialog rather than
// five near-identical ones.
export interface UmtReleaseChunkConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: "primary" | "error";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function UmtReleaseChunkConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "primary",
  busy = false,
  onCancel,
  onConfirm,
}: UmtReleaseChunkConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          loading={busy}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
