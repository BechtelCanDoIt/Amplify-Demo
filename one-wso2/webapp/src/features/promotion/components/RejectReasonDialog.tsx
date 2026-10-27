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
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Typography } from "@wso2/oxygen-ui";

// A confirmation dialog with a mandatory reason field — ports source's own
// showConfirmation(..., { type: "textarea", mandatory: true }) call for
// promotion-request rejection (submittedRequests.tsx's single and bulk
// reject both use it). The shared ConfirmationDialog has no input slot, so
// this is a separate small dialog rather than stretching that one's
// contract for its one caller that needs a field.
export default function RejectReasonDialog({
  open,
  count,
  onClose,
  onConfirm,
}: {
  open: boolean;
  /** How many requests this will reject — singular/plural copy only. */
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Do you want to reject {count > 1 ? "these promotion requests" : "this promotion request"}?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1.5 }}>
          {count > 1 ? "Common reason for rejection" : "Reason for rejection"} *
        </DialogContentText>
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={6}
          slotProps={{ htmlInput: { maxLength: 250 } }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5 }}>
          {reason.length}/250
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>No</Button>
        <Button
          color="error"
          variant="contained"
          disabled={reason.trim() === ""}
          onClick={() => {
            onConfirm(reason);
            handleClose();
          }}
        >
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
