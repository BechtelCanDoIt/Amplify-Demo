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

import type { JSX } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@wso2/oxygen-ui";
import type { ApprovalPreviewInput } from "@features/sales/cado2/approvals/api/approvalTypes";
import { useApprovalPreview } from "@features/sales/cado2/approvals/api/useApprovalApi";
import ApprovalPreviewPanel from "./ApprovalPreviewPanel";

interface ApprovalPreviewDialogProps {
  /** The wizard's choices when the dialog was opened; null = closed. */
  readonly body: ApprovalPreviewInput | null;
  readonly onClose: () => void;
}

/**
 * "Preview approvals" before Review: who would approve the quote as it stands
 * when the button was clicked. Worked out only on request, not on every edit.
 */
export default function ApprovalPreviewDialog({ body, onClose }: ApprovalPreviewDialogProps): JSX.Element {
  const preview = useApprovalPreview(body);
  return (
    <Dialog open={body !== null} onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="approval-preview-title">
      <DialogTitle id="approval-preview-title">Who approves if you submit now</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Based on the quote as it stands. Deal Desk goes first; the discount and commercial approvals then run in
          parallel. Nothing is sent until you submit. Review shows this again, kept up to date.
        </Typography>
        <ApprovalPreviewPanel preview={preview.data} loading={preview.isFetching} error={preview.error} bare />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
