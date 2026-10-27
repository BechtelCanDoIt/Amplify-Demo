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
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { humanizeHttpError } from "@api/http";
import { useSaveRatioScale, type CreditScoreRatio } from "../api/usePreferences";

// Ported from the source app's Preferences/RatioTable.js — one category's
// editable ratio scale, submitted independently of every other category's
// table (see useSaveRatioScale's note on why the PATCH carries only this
// category's rows).
export default function RatioTable({ category, ratios }: { category: string; ratios: CreditScoreRatio[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CreditScoreRatio[]>(ratios);
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });
  const saveRatioScale = useSaveRatioScale();

  const startEdit = () => {
    setDraft(ratios.map((r) => ({ ...r })));
    setEditing(true);
  };
  const cancel = () => {
    setDraft(ratios);
    setEditing(false);
  };

  const updateCell = (id: number, field: "minVal" | "maxVal" | "creditScore", value: string) => {
    setDraft((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [field]: field === "creditScore" ? value : value === "" ? null : parseFloat(value) }
          : row,
      ),
    );
  };

  const submit = () => {
    // A row's credit score is required — mirrors the source's
    // validateCreditScore(), which blocks the save when any row's
    // creditScore is an empty string.
    if (draft.some((r) => r.creditScore === "")) {
      setSnack({ open: true, severity: "error", message: "Credit score is required for every row." });
      return;
    }
    saveRatioScale.mutate(draft, {
      onSuccess: () => setEditing(false),
      onError: (err) =>
        setSnack({ open: true, severity: "error", message: `Couldn't save. ${humanizeHttpError(err)}` }),
    });
  };

  return (
    <Stack spacing={1}>
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {category}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ratio Category</TableCell>
              <TableCell align="right">Min Value</TableCell>
              <TableCell align="right">Max Value</TableCell>
              <TableCell align="right">Credit Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(editing ? draft : ratios).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.ratioCategory}</TableCell>
                <TableCell align="right">
                  {editing ? (
                    <TextField
                      size="small"
                      type="number"
                      defaultValue={row.minVal ?? ""}
                      onChange={(e) => updateCell(row.id, "minVal", e.target.value)}
                      slotProps={{ htmlInput: { style: { textAlign: "end", width: 70 } } }}
                    />
                  ) : (
                    (row.minVal ?? "")
                  )}
                </TableCell>
                <TableCell align="right">
                  {editing ? (
                    <TextField
                      size="small"
                      type="number"
                      defaultValue={row.maxVal ?? ""}
                      onChange={(e) => updateCell(row.id, "maxVal", e.target.value)}
                      slotProps={{ htmlInput: { style: { textAlign: "end", width: 70 } } }}
                    />
                  ) : (
                    (row.maxVal ?? "")
                  )}
                </TableCell>
                <TableCell align="right">
                  {editing ? (
                    <TextField
                      size="small"
                      error={row.creditScore === ""}
                      defaultValue={row.creditScore}
                      onChange={(e) => updateCell(row.id, "creditScore", e.target.value)}
                      slotProps={{ htmlInput: { style: { textAlign: "end", width: 70 } } }}
                    />
                  ) : (
                    row.creditScore
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        {editing ? (
          <Button size="small" variant="outlined" onClick={cancel} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
        ) : (
          <Button size="small" variant="outlined" onClick={startEdit} sx={{ textTransform: "none" }}>
            Edit
          </Button>
        )}
        <Button
          size="small"
          variant="contained"
          disabled={!editing || saveRatioScale.isPending}
          onClick={submit}
          sx={{ textTransform: "none" }}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  );
}
