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
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@wso2/oxygen-ui";

// Ports the Notification Hub's own confirmation dialog for
// notifyApplicant — an APPROVED row/selection additionally asks for an
// effective date (source's own mandatory field, a plain date here rather
// than source's own textarea for it — same payload, easier to fill in); a
// REJECTED/FL_REJECTED row/selection has no extra field at all.
export default function NotifyApplicantDialog({
  open,
  message,
  requiresEffectiveDate,
  onClose,
  onConfirm,
}: {
  open: boolean;
  message: string;
  requiresEffectiveDate: boolean;
  onClose: () => void;
  onConfirm: (effectiveDate?: string) => void;
}) {
  const [effectiveDate, setEffectiveDate] = useState("");

  const handleClose = () => {
    setEffectiveDate("");
    onClose();
  };

  const canConfirm = !requiresEffectiveDate || effectiveDate.trim() !== "";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{message}</DialogTitle>
      {requiresEffectiveDate && (
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>Effective Date *</DialogContentText>
          <TextField
            fullWidth
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={handleClose}>No</Button>
        <Button
          color="primary"
          variant="contained"
          disabled={!canConfirm}
          onClick={() => {
            onConfirm(requiresEffectiveDate ? effectiveDate : undefined);
            handleClose();
          }}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
}
