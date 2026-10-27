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

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@wso2/oxygen-ui";
import type { GroupAction } from "../api/emailGroupTypes";

// One dialog for every subscribe/unsubscribe — a single row's own action
// chip, or a bulk selection — so there is exactly one place a mailing-list
// change gets confirmed before it fires, whether it is one group or twenty.
export default function ConfirmGroupActionDialog({
  open,
  action,
  groups,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  action: GroupAction;
  groups: readonly string[];
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const verb = action === "subscribe" ? "subscribe to" : "unsubscribe from";
  const label = action === "subscribe" ? "Subscribe" : "Unsubscribe";

  return (
    <Dialog
      open={open}
      // Not closable mid-flight: the requests are already going out one by
      // one, and a dialog that vanishes on a stray backdrop click leaves the
      // user unsure how many of them landed.
      onClose={busy ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        {label} {groups.length > 1 ? `${groups.length} groups` : "this group"}?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: groups.length > 1 ? 1 : 0 }}>
          Do you want to {verb} the following {groups.length > 1 ? "groups" : "group"}?
        </Typography>
        {groups.length > 1 && (
          <List dense disablePadding sx={{ maxHeight: 240, overflowY: "auto" }}>
            {groups.map((name) => (
              <ListItem key={name} disableGutters sx={{ py: 0.25 }}>
                <ListItemText
                  primary={name}
                  slotProps={{ primary: { sx: { fontSize: 13, wordBreak: "break-all" } } }}
                />
              </ListItem>
            ))}
          </List>
        )}
        {groups.length === 1 && (
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, mt: 0.5, wordBreak: "break-all" }}>
            {groups[0]}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={action === "unsubscribe" ? "error" : "success"}
          onClick={onConfirm}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
