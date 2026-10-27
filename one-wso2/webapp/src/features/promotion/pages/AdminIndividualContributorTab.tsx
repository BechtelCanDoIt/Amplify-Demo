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

// Ports promotion-app's own
// view/administration/panels/individualContributorPromotions.tsx — an
// audit/monitoring list of INDIVIDUAL_CONTRIBUTOR requests for the
// currently open cycle. Read-mostly: source has no approve/reject/bulk
// action here at all (contrast every other admin/lead/board grid), the only
// mutation is editing a rejected request's own reason after the fact.
import { useState } from "react";
import { Box, Card, Chip, DataGrid, IconButton, InputAdornment, Skeleton, Stack, TextField, Tooltip } from "@wso2/oxygen-ui";
import { EyeIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { useActivePromotionCycle } from "../api/usePromotionCycle";
import { usePromotionRequests, useUpdatePromotionRequestRejectionReason } from "../api/usePromotionRequests";
import JobBandTransitionChips from "../components/JobBandTransitionChips";
import PromotionEmptyState from "../components/PromotionEmptyState";
import PromotionFeedbackSnackbar from "../components/PromotionFeedbackSnackbar";
import { usePromotionFeedback } from "../util/usePromotionFeedback";
import DeclinedReasonDialog, { type DeclinedReasonTarget } from "../components/DeclinedReasonDialog";
import { promotionRequestChipColor } from "../util/promotionStatus";
import { encodePromotionText } from "../util/promotionRichText";
import { capitalizeWords } from "../util/promotionText";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { PromotionRequestFull } from "../api/types";

export default function AdminIndividualContributorTab() {
  const cycle = useActivePromotionCycle();
  const requests = usePromotionRequests(
    { type: "INDIVIDUAL_CONTRIBUTOR", cycleId: cycle.cycle?.id },
    !cycle.isPending && Boolean(cycle.cycle),
  );
  const updateReason = useUpdatePromotionRequestRejectionReason();
  const [editingTarget, setEditingTarget] = useState<DeclinedReasonTarget | null>(null);
  const [search, setSearch] = useState("");
  const { feedback, notifySuccess, notifyError, close } = usePromotionFeedback();

  const allRows = requests.data?.promotionRequests ?? [];
  const rows = allRows.filter((r) => r.employeeEmail.toLowerCase().includes(search.trim().toLowerCase()));

  const columns: DataGrid.GridColDef<PromotionRequestFull>[] = [
    // Only Employee Email and Lead Email carry genuinely variable-length
    // content, so only they use `flex` (sharing out any leftover space) —
    // everything else is a fixed `width`, so a short value like "Core
    // Services" doesn't balloon and push Promote to past the visible edge.
    { field: "employeeEmail", headerName: "Employee Email", flex: 1.4, minWidth: 220 },
    {
      display: "flex",
      field: "status",
      headerName: "Promotion Status",
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" color={promotionRequestChipColor(params.value)} />
      ),
    },
    {
      display: "flex",
      field: "reasonForRejection",
      headerName: "Declined Reason",
      width: 140,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) =>
        params.row.status === "FL_REJECTED" || params.row.status === "REJECTED" ? (
          <Tooltip title="View / edit reason">
            <IconButton
              size="small"
              onClick={() =>
                setEditingTarget({ key: params.row.id, initialValue: params.row.reasonForRejection })
              }
            >
              <EyeIcon size={16} />
            </IconButton>
          </Tooltip>
        ) : (
          "N/A"
        ),
    },
    {
      display: "flex",
      field: "recommendations",
      headerName: "Lead Email",
      flex: 1.2,
      minWidth: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {params.row.recommendations.map((r) => (
            <Chip key={r.recommendationID} label={`Lead: ${r.leadEmail}`} size="small" variant="outlined" />
          ))}
        </Stack>
      ),
    },
    { field: "team", headerName: "Team", width: 130, valueFormatter: (value: string) => capitalizeWords(value) },
    {
      field: "department",
      headerName: "Department",
      width: 150,
      valueFormatter: (value: string) => capitalizeWords(value),
    },
    {
      display: "flex",
      field: "promoteTo",
      headerName: "Promote to",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <JobBandTransitionChips currentJobBand={params.row.currentJobBand} nextJobBand={params.row.nextJobBand} />
      ),
    },
  ];

  return (
    <>
      <PromotionFeedbackSnackbar feedback={feedback} onClose={close} />
      <DeclinedReasonDialog
        title="Declined Reason"
        target={editingTarget}
        saving={updateReason.isPending}
        onClose={() => setEditingTarget(null)}
        onSave={(text) => {
          if (!editingTarget) return;
          updateReason.mutate(
            { id: editingTarget.key, reasonForRejection: encodePromotionText(text) },
            {
              onSuccess: () => {
                setEditingTarget(null);
                notifySuccess("Declined reason updated.");
              },
              onError: (error) => notifyError(`Unable to update the declined reason. ${humanizeHttpError(error)}`),
            },
          );
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 1.5, gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by employee email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon size={16} /></InputAdornment> } }}
          sx={{ minWidth: 240 }}
        />
      </Box>

      {cycle.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : cycle.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load the promotion cycle. ${humanizeHttpError(cycle.error)}`}
        />
      ) : !cycle.cycle ? (
        <PromotionEmptyState message="There is no active promotion cycle" />
      ) : requests.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : requests.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load promotion requests. ${humanizeHttpError(requests.error)}`}
        />
      ) : allRows.length === 0 ? (
        <PromotionEmptyState message="There are no promotion requests for the active cycle" />
      ) : rows.length === 0 ? (
        <PromotionEmptyState message="No promotion requests match the search" />
      ) : (
        <Card variant="outlined" sx={{ p: 2 }}>
          <DataGrid.DataGrid
            rows={rows}
            columns={columns}
            // The Lead Email column wraps onto a second line for any
            // row with more than one recommendation — a fixed row height
            // would clip it, so let the row grow to fit.
            getRowHeight={() => "auto"}
            sx={{
              border: "none",
              ...GRID_NO_POINTER_FOCUS_SX,
              // Auto row height needs its own vertical padding; without it
              // the chips sit flush against the row divider.
              "& .MuiDataGrid-cell": { py: 1, alignItems: "center" },
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      )}
    </>
  );
}
