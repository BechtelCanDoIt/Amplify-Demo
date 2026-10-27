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

import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@wso2/oxygen-ui";

// Asked before Proceed on PR Analysis and Product Analysis when this session
// has changed inputs that haven't been analysed: Proceed promotes on the last
// analysis result, so those changes would be dropped without a word.
export default function UmtUnanalyzedChangesDialog({
  open,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Unanalysed Changes</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {message} Proceeding uses the last analysis result and discards these changes. Do you want to proceed
          anyway?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm}>
          Proceed Anyway
        </Button>
      </DialogActions>
    </Dialog>
  );
}
