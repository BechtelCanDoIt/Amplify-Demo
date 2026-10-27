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
import { Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@wso2/oxygen-ui";
import { useAdminEmployeeDirectory, useUpdateUser } from "../api/useAdminUsers";
import type { PromotionUser } from "../api/types";

// Ports source's own "Transfer Access" dialog — moves an existing system
// user's account (its roles + ACL, unchanged) onto a DIFFERENT employee's
// email. Source scopes the picker to leads only (isLeadsOnly) since every
// caller of this dialog is transferring a LEAD/FUNCTIONAL_LEAD's own
// ongoing responsibilities to someone else, not an arbitrary employee.
export default function TransferAccessDialog({
  user,
  onClose,
}: {
  user: PromotionUser | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(user)} onClose={onClose} maxWidth="sm" fullWidth>
      {user && <TransferAccessDialogContent key={user.id} user={user} onClose={onClose} />}
    </Dialog>
  );
}

function TransferAccessDialogContent({ user, onClose }: { user: PromotionUser; onClose: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const directory = useAdminEmployeeDirectory(true, pickerOpen);
  const updateUser = useUpdateUser();

  return (
    <>
      <DialogTitle>Transfer Access</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>From: {user.email}</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>To *</Typography>
        <Autocomplete
          size="small"
          options={(directory.data?.employees ?? []).filter((e) => e.workEmail !== user.email)}
          loading={directory.isPending}
          getOptionLabel={(o) => `${o.firstName} ${o.lastName} (${o.workEmail})`}
          onOpen={() => setPickerOpen(true)}
          onChange={(_e, value) => setNewEmail(value?.workEmail ?? null)}
          renderInput={(params) => <TextField {...params} placeholder="Select a lead..." />}
        />
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">To: {newEmail ?? "<Select User>"}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!newEmail || updateUser.isPending}
          onClick={() => {
            if (!newEmail) return;
            updateUser.mutate(
              {
                id: user.id,
                email: newEmail,
                roles: user.roles,
                functionalLeadAccessLevels: user.functionalLeadAccessLevels,
              },
              { onSuccess: onClose },
            );
          }}
        >
          Transfer
        </Button>
      </DialogActions>
    </>
  );
}
