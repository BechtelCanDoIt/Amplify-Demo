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
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import type { JSX } from "react";
import { useAuthApiClient } from "@features/security/grc/shim/useAuthApiClient";
import { createCustomer } from "../../api/riskApi";
import type { LookupOption } from "../../api/riskApi";
import { dialogPaperSx } from "../cardStyles";
import { CUSTOMER_CODE_MAX, LOOKUP_NAME_MAX, customerCodeError } from "../../../admin/components/lookupValidation";

interface AddCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  // Called with the new customer once it exists, so the caller can offer and
  // select it straight away.
  onCreated: (customer: LookupOption) => void;
}

// Adds a customer missing from the Customer Name list. It takes effect at once,
// with no approval. The code goes into the risk code and can't be changed after
// a risk uses the customer, so it is required and worth getting right.
export default function AddCustomerDialog({ open, onClose, onCreated }: AddCustomerDialogProps): JSX.Element {
  const authFetch = useAuthApiClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    if (saving) return;
    setName("");
    setCode("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    const codeError = customerCodeError(code);
    if (codeError) {
      setError(codeError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const customer = await createCustomer(authFetch, { name: name.trim(), code });
      onCreated(customer);
      setName("");
      setCode("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add the customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle>Add new customer</DialogTitle>
      <DialogContent sx={{ pt: "24px !important" }}>
        <Stack gap={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            The customer is added straight away and selected for this risk. Its code goes into the risk code and can't
            be changed once a risk uses it.
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            required
            fullWidth
            size="small"
            label="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: LOOKUP_NAME_MAX } }}
            disabled={saving}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Customer code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            slotProps={{ htmlInput: { maxLength: CUSTOMER_CODE_MAX } }}
            helperText={`Capital letters and digits, up to ${CUSTOMER_CODE_MAX}, e.g. BANKONESUB.`}
            disabled={saving}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? "Adding…" : "Add customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
