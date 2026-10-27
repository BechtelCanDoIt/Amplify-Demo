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

// Ports promotion-app's own view/administration/panels/withdrawalRequest.tsx
// — every WITHDRAW (pending decision) and REMOVED (withdrawal already
// approved) promotion request, org-wide. A data grid, matching the
// convention every other portal in this app already uses, instead of a
// hand-rolled column-header-plus-dashed-card list — that hand-rolled shape
// is what caused the header/row alignment drift a plain Grid can't avoid
// (its own `spacing` applies a compensating negative margin that a data
// grid's native column layout never has to fight).
import { useState } from "react";
import { alpha, Box, Card, Chip, DataGrid, Divider, IconButton, Skeleton, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { CheckIcon, ChevronDownIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import ConfirmationDialog, { type ConfirmationContent } from "@components/confirmation-dialog/ConfirmationDialog";
import { useApproveWithdrawal, useRejectWithdrawal, useWithdrawalRequests } from "../api/useWithdrawalRequests";
import JobBandTransitionChips from "../components/JobBandTransitionChips";
import PromotionEmptyState from "../components/PromotionEmptyState";
import { PromotionGridToolbar } from "../components/PromotionGridToolbar";
import WithdrawalRequestDetailDialog from "../components/WithdrawalRequestDetailDialog";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { PromotionRequestFull } from "../api/types";
import type { Theme } from "@wso2/oxygen-ui";

const ROW_COLOR_SX = { "& .row-removed": { bgcolor: (theme: Theme) => alpha(theme.palette.error.main, 0.08) } };

export default function AdminWithdrawalRequestsTab() {
  const requests = useWithdrawalRequests();
  const approve = useApproveWithdrawal();
  const reject = useRejectWithdrawal();
  const [confirm, setConfirm] = useState<ConfirmationContent | null>(null);
  const [viewing, setViewing] = useState<PromotionRequestFull | null>(null);

  const rows = requests.data?.promotionRequests ?? [];
  const withdrawalCount = rows.filter((r) => r.status === "WITHDRAW").length;
  const approvedCount = rows.filter((r) => r.status === "REMOVED").length;

  const columns: DataGrid.GridColDef<PromotionRequestFull>[] = [
    { field: "employeeEmail", headerName: "Employee Email", flex: 1.3, minWidth: 190 },
    { field: "promotionCycle", headerName: "Promotion Cycle", flex: 1, minWidth: 140 },
    {
      display: "flex",
      field: "promoteTo",
      headerName: "Promote to",
      flex: 0.9,
      minWidth: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <JobBandTransitionChips currentJobBand={params.row.currentJobBand} nextJobBand={params.row.nextJobBand} />
      ),
    },
    {
      display: "flex",
      field: "action",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      disableExport: true,
      flex: 1.1,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {params.row.status === "REMOVED" && (
            <Chip label="Withdrawal Approved" size="small" variant="outlined" color="error" />
          )}
          {params.row.status === "WITHDRAW" && (
            <>
              <Tooltip title="Approve withdrawal">
                <IconButton
                  size="small"
                  color="success"
                  disabled={approve.isPending || reject.isPending}
                  onClick={() =>
                    setConfirm({
                      title: "Are you sure?",
                      text: "Do you want to approve this withdrawal request?",
                      confirmLabel: "Approve",
                      confirmAction: () => approve.mutate(params.row.id),
                    })
                  }
                >
                  <CheckIcon size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject withdrawal">
                <IconButton
                  size="small"
                  color="error"
                  disabled={approve.isPending || reject.isPending}
                  onClick={() =>
                    setConfirm({
                      title: "Are you sure?",
                      text: "Do you want to reject this withdrawal request?",
                      confirmLabel: "Reject",
                      confirmAction: () => reject.mutate(params.row.id),
                    })
                  }
                >
                  <XIcon size={16} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => setViewing(params.row)}>
              <ChevronDownIcon size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <ConfirmationDialog content={confirm} onClose={() => setConfirm(null)} />
      <WithdrawalRequestDetailDialog request={viewing} onClose={() => setViewing(null)} />

      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 1.5 }}>
        {rows.length > 0 && (
          <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>All Count: {rows.length}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "success.main" }}>
              Withdrawal Count: {withdrawalCount}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "error.main" }}>
              Approved Withdrawal Count: {approvedCount}
            </Typography>
          </Stack>
        )}
      </Box>

      {requests.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : requests.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load withdrawal requests. ${humanizeHttpError(requests.error)}`}
        />
      ) : rows.length === 0 ? (
        <PromotionEmptyState message="There are no pending withdrawal requests" />
      ) : (
        <Card variant="outlined" sx={{ p: 2 }}>
          <DataGrid.DataGrid
            rows={rows}
            columns={columns}
            getRowClassName={(params) => (params.row.status === "REMOVED" ? "row-removed" : "")}
            showToolbar
            slots={{ toolbar: PromotionGridToolbar }}
            sx={{ border: "none", ...GRID_NO_POINTER_FOCUS_SX, ...ROW_COLOR_SX }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      )}
    </>
  );
}
