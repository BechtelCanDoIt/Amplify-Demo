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

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@wso2/oxygen-ui";

// Asked before a lead or admin releases a hotfix whose integration tests
// haven't passed: that release needs a reason.
export default function UmtHotfixReleaseReasonDialog({
  open,
  loading,
  onCancel,
  onRelease,
}: {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onRelease: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Release Without Passing Tests</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          The integration tests have not passed. Give a reason to release this hotfix anyway.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={!trimmed} loading={loading} onClick={() => onRelease(trimmed)}>
          Release
        </Button>
      </DialogActions>
    </Dialog>
  );
}
