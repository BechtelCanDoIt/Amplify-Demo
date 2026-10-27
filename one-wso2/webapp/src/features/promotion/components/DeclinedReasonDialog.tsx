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
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Tooltip, Typography } from "@wso2/oxygen-ui";
import { PencilIcon } from "@wso2/oxygen-ui-icons-react";
import { decodePromotionText } from "../util/promotionRichText";

export interface DeclinedReasonTarget {
  /** Uniquely identifies the row being edited — used as the remount key so
   * the dialog's own local edit state resets fresh per row. */
  key: number;
  initialValue: string | null;
}

// Shared by the Admin Portal's Individual Contributor tab (editing a
// request's reasonForRejection) and Time Based tab (editing a
// recommendation's own additional comment) — both port the same
// view/edit-a-plain-text-reason modal shape from source (a plain
// TextField, not the rich-text editor Lead Portal statements use).
export default function DeclinedReasonDialog({
  title,
  target,
  onClose,
  onSave,
  saving,
}: {
  title: string;
  target: DeclinedReasonTarget | null;
  onClose: () => void;
  onSave: (plainText: string) => void;
  saving: boolean;
}) {
  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="sm" fullWidth>
      {target && (
        <DeclinedReasonDialogContent
          key={target.key}
          title={title}
          target={target}
          onClose={onClose}
          onSave={onSave}
          saving={saving}
        />
      )}
    </Dialog>
  );
}

function DeclinedReasonDialogContent({
  title,
  target,
  onClose,
  onSave,
  saving,
}: {
  title: string;
  target: DeclinedReasonTarget;
  onClose: () => void;
  onSave: (plainText: string) => void;
  saving: boolean;
}) {
  const original = decodePromotionText(target.initialValue).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(original);

  const canSave = !saving && value.trim() !== "" && value.trim() !== original;

  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {saving ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : editing ? (
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        ) : (
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {original || "No additional comment provided."}
            </Typography>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => setEditing(true)}>
                <PencilIcon size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {editing ? (
          <>
            <Button
              onClick={() => {
                setValue(original);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="contained" color="primary" disabled={!canSave} onClick={() => onSave(value.trim())}>
              Save
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </>
  );
}
