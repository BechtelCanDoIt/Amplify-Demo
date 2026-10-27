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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";

/** The same cap the claim form puts on a comment — matches expense's own. */
const REASON_MAX = 100;

export type OpdApprovalDecision = "approve" | "reject";

/**
 * `ExpenseApprovalDecisionDialog`'s pattern, carried over for OPD. A decision
 * here is final either way — approved, it is money committed; rejected, it is
 * sent back with a reason attached — so it is confirmed rather than taken on
 * one click, the same as the expense side.
 *
 * No stage to name in the wording: OPD has one review stage, not two — the
 * backend grants its finance-approver role or nothing, with no lead step in
 * between. A reason is asked on every rejection, not only some, for the same
 * reason: there is no earlier stage for one to belong to instead.
 */
export function OpdApprovalDecisionDialog({
  decision,
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  decision: OpdApprovalDecision;
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string | undefined) => void;
}) {
  const [reason, setReason] = useState("");

  const approving = decision === "approve";

  const close = () => {
    setReason("");
    onCancel();
  };

  return (
    // Closes on Esc and a backdrop click, so a decision dialog opened by
    // accident can only be left through Cancel — matches the expense side.
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 17, fontWeight: 700 }}>
        {approving ? "Approve Confirmation" : "Reject Confirmation"}
      </DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontSize: 13.5 }}>
          You&apos;re performing this action as a Finance approver. Are you sure you want to
          proceed?
        </Typography>
        {!approving && (
          <TextField
            multiline
            minRows={3}
            fullWidth
            autoComplete="off"
            disabled={pending}
            placeholder="Provide a reason for rejecting the OPD claim"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            helperText={`${reason.length}/${REASON_MAX}`}
            slotProps={{ formHelperText: { sx: { textAlign: "right", fontSize: 10 } } }}
            sx={{ mt: 2 }}
            inputProps={{ "aria-label": "Rejection reason" }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={close} disabled={pending}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          color={approving ? "success" : "error"}
          // The employee is only ever told why through this reason, so a
          // rejection cannot go out empty.
          disabled={pending || (!approving && reason.trim().length === 0)}
          onClick={() => {
            onConfirm(approving ? undefined : reason);
            setReason("");
          }}
        >
          {pending ? (approving ? "Approving…" : "Rejecting…") : approving ? "Approve" : "Reject"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
