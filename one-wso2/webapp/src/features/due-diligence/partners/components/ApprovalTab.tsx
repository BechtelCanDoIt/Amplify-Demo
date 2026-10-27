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

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { CheckIcon, EllipsisIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { authedGet, authedPatch, humanizeHttpError } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { dueDiligenceServiceUrls } from "@config/apiConfig";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import { PARTNERS_QUERY_KEY, type ApprovalSummaryData } from "../api/usePartners";

// Ported from the source app's Resellers/ResellerDashboard/Approval/Approval.js
// — a read-only summary of finance/legal results plus the admin-only
// activate/deactivate action.
//
// Deliberately NOT TanStack Query here: this tab always calls the backend
// directly (on mount, and again right after a status change) instead of
// reading through the app's shared query cache, so what it shows is always
// exactly what the backend has right now, not a value another screen's
// query may have cached a moment before.
export default function ApprovalTab({ companyId }: { companyId: string }) {
  const gate = useDueDiligenceGate();
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  const [summary, setSummary] = useState<ApprovalSummaryData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [loadError, setLoadError] = useState<unknown>(undefined);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState<"active" | "inactive" | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const loadSummary = useCallback(async () => {
    setLoadState("loading");
    try {
      const accessToken = await getAccessToken();
      const data = await authedGet<ApprovalSummaryData>(dueDiligenceServiceUrls.approvalSummary(companyId), accessToken);
      setSummary(data);
      setLoadState("ready");
    } catch (err) {
      setLoadError(err);
      setLoadState("error");
    }
  }, [companyId, getAccessToken]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const financeResult = summary?.summary[0]?.financeResult;
  const financeSpecialApproval = summary?.summary[0]?.financeSpecialApproval;
  const legalResult = summary?.summary[0]?.legalResult;
  const resellerLink = summary?.resellerLinks[0];

  const confirmChange = async () => {
    if (!confirmingStatus || !resellerLink) return;
    const linkId = resellerLink.linkId;
    const status = confirmingStatus;
    setConfirmingStatus(null);
    setChangingStatus(true);
    try {
      const accessToken = await getAccessToken();
      await authedPatch(dueDiligenceServiceUrls.partnerLinkStatusField(linkId), accessToken, { linkId, status });
      setSnack({ open: true, severity: "success", message: "Updated successfully" });
      await loadSummary();
      // This tab fetches directly rather than through TanStack Query, but the
      // Partners list and the rest of this dashboard still read through the
      // cache — without invalidating it here, they'd keep showing the old
      // status until a full page reload.
      void queryClient.invalidateQueries({ queryKey: PARTNERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["due-diligence", "partner"] });
    } catch (err) {
      setSnack({ open: true, severity: "error", message: `Couldn't update. ${humanizeHttpError(err)}` });
    } finally {
      setChangingStatus(false);
    }
  };

  if (loadState === "loading") {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mt: 2 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading approval summary…
        </Typography>
      </Stack>
    );
  }
  if (loadState === "error") {
    return <Alert severity="error">Couldn't load the approval summary. {humanizeHttpError(loadError)}</Alert>;
  }

  return (
    <Box sx={{ p: 2 }}>
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: financeSpecialApproval ? "1fr 1fr 1fr" : "1fr 1fr",
          gap: 2,
          mb: 2,
        }}
      >
        {financeResult && <ResultRow label="Finance Approval" value={financeResult} />}
        {financeSpecialApproval && (
          <ResultRow label="Finance Special Approval" value={financeSpecialApproval === "requested" ? "pending" : financeSpecialApproval} />
        )}
        {legalResult && <ResultRow label="Legal Approval" value={legalResult} />}
      </Box>

      <Box sx={{ height: "1px", bgcolor: "divider", my: 2 }} />

      {resellerLink && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2">Company Status</Typography>
          <Chip
            icon={resellerLink.status === "active" ? <CheckIcon size={14} /> : <XIcon size={14} />}
            label={resellerLink.status.charAt(0).toUpperCase() + resellerLink.status.slice(1)}
            variant="outlined"
            color={resellerLink.status === "active" ? "success" : "error"}
          />
          {gate.hasRole("adminRole") && (
            <Button
              size="small"
              variant="contained"
              color={resellerLink.status === "active" ? "secondary" : "primary"}
              startIcon={changingStatus ? <CircularProgress size={14} color="inherit" /> : undefined}
              disabled={changingStatus}
              onClick={() => setConfirmingStatus(resellerLink.status === "active" ? "inactive" : "active")}
              sx={{ textTransform: "none" }}
            >
              {resellerLink.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          )}
        </Stack>
      )}

      <Dialog open={confirmingStatus !== null} onClose={() => setConfirmingStatus(null)}>
        <DialogTitle>
          {confirmingStatus === "inactive" ? "Do you want to deactivate this company?" : "Do you want to activate this company?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmingStatus === "inactive"
              ? "This company will no longer be a partner of WSO2. Are you sure you want to do this?"
              : "This company will become a partner of WSO2. Are you sure?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingStatus(null)}>Cancel</Button>
          <Button onClick={() => void confirmChange()} color="secondary" autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  const icon = value === "pending" ? <EllipsisIcon size={14} /> : value === "approved" ? <CheckIcon size={14} /> : <XIcon size={14} />;
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Typography variant="body2">{label}</Typography>
      <Chip
        icon={icon}
        label={value}
        variant="outlined"
        color={value === "rejected" ? "secondary" : "primary"}
        sx={{ textTransform: "capitalize" }}
      />
    </Stack>
  );
}
