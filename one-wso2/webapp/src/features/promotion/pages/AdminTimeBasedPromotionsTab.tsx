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
// view/administration/panels/timeBasedPromotion.tsx — bootstraps TIME_BASED
// requests for the open cycle from a Google Sheet when none exist yet, then
// (once populated) a monitoring grid with a per-recommendation "declined
// reason" edit. No approve/reject here — that's the Functional Lead/
// Promotion Board portals' own concern; this tab only imports and audits.
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  DataGrid,
  Grid,
  IconButton,
  Radio,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { EyeIcon, UploadIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import ConfirmationDialog, { type ConfirmationContent } from "@components/confirmation-dialog/ConfirmationDialog";
import { useActivePromotionCycle } from "../api/usePromotionCycle";
import { usePromotionRequests } from "../api/usePromotionRequests";
import { useSaveRecommendation } from "../api/useLeadRecommendations";
import { useImportTimeBasedPromotions } from "../api/useTimeBasedPromotionAdmin";
import { usePromotionSyncState } from "../api/usePromotionSyncState";
import JobBandTransitionChips from "../components/JobBandTransitionChips";
import PromotionEmptyState from "../components/PromotionEmptyState";
import { PromotionGridToolbar } from "../components/PromotionGridToolbar";
import DeclinedReasonDialog, { type DeclinedReasonTarget } from "../components/DeclinedReasonDialog";
import GoogleSheetLinkDialog from "../components/GoogleSheetLinkDialog";
import PromotionFeedbackSnackbar from "../components/PromotionFeedbackSnackbar";
import { usePromotionFeedback } from "../util/usePromotionFeedback";
import PromotionSyncStatusLabel from "../components/PromotionSyncStatusLabel";
import { encodePromotionText } from "../util/promotionRichText";
import { formatDate } from "../util/promotionHistory";
import { capitalizeWords } from "../util/promotionText";
import { promotionRequestChipColor, recommendationChipColor } from "../util/promotionStatus";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { PromotionRecommendation, PromotionRequestFull, RecommendationStatus } from "../api/types";

const LEAD_STATUS_LABEL: Partial<Record<RecommendationStatus, string>> = {
  REQUESTED: "Pending",
  SUBMITTED: "Approved",
};

function declinedRecommendations(row: PromotionRequestFull): PromotionRecommendation[] {
  return row.recommendations.filter((r) => r.recommendationStatus === "DECLINED");
}

export default function AdminTimeBasedPromotionsTab() {
  const cycle = useActivePromotionCycle();
  const requests = usePromotionRequests(
    { type: "TIME_BASED", cycleId: cycle.cycle?.id },
    !cycle.isPending && Boolean(cycle.cycle),
  );
  const sync = usePromotionSyncState("TIME_BASED_PROMOTION_STATE", !cycle.isPending);
  const importPromotions = useImportTimeBasedPromotions();
  const updateRecommendation = useSaveRecommendation();

  const [source, setSource] = useState<"par-app" | "sheet">("sheet");
  const [confirmImport, setConfirmImport] = useState<ConfirmationContent | null>(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<DeclinedReasonTarget | null>(null);
  const [editingRecommendation, setEditingRecommendation] = useState<PromotionRecommendation | null>(null);
  const { feedback, notifySuccess, notifyError, close } = usePromotionFeedback();

  // Refetch the list once a running sync settles to SUCCESS. Ref-tracked so
  // this fires once per settle, not on every re-render while already settled.
  const lastSyncState = useRef(sync.state);
  useEffect(() => {
    if (lastSyncState.current === sync.state) return;
    lastSyncState.current = sync.state;
    if (sync.state === "SUCCESS") {
      void requests.refetch();
      notifySuccess("Successfully synchronized time-based promotions.");
    } else if (sync.state === "ERROR") {
      notifyError("Unable to synchronize time-based promotions. Please contact the app support.");
    }
  }, [sync.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = requests.data?.promotionRequests ?? [];

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
      field: "recommendations",
      headerName: "Lead Status",
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {params.row.recommendations.map((r) => (
            <Chip
              key={r.recommendationID}
              label={LEAD_STATUS_LABEL[r.recommendationStatus] ?? r.recommendationStatus}
              size="small"
              variant="outlined"
              color={recommendationChipColor(r.recommendationStatus)}
            />
          ))}
        </Stack>
      ),
    },
    {
      display: "flex",
      field: "leadEmail",
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
    {
      field: "businessUnit",
      headerName: "Business Unit",
      width: 140,
      valueFormatter: (value: string) => capitalizeWords(value),
    },
    {
      field: "department",
      headerName: "Department",
      width: 150,
      valueFormatter: (value: string) => capitalizeWords(value),
    },
    {
      field: "team",
      headerName: "Team",
      width: 130,
      valueFormatter: (value: string) => capitalizeWords(value),
    },
    {
      field: "subTeam",
      headerName: "Sub Team",
      width: 120,
      valueFormatter: (value: string | null) => capitalizeWords(value),
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
    // Hidden by default (toggle via the toolbar's Columns panel) — kept out
    // of the way instead of widening the grid for data most admins don't
    // need daily.
    {
      display: "flex",
      field: "declinedReason",
      headerName: "Declined Reason",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      filterable: false,
      disableExport: true,
      renderCell: (params) => {
        const declined = declinedRecommendations(params.row);
        return declined.length === 0 ? (
          "N/A"
        ) : (
          <Stack direction="row" spacing={0.5}>
            {declined.map((rec) => (
              <Tooltip key={rec.recommendationID} title={`View / edit reason — ${rec.leadEmail}`}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingRecommendation(rec);
                    setEditingTarget({ key: rec.recommendationID, initialValue: rec.recommendationAdditionalComment });
                  }}
                >
                  <EyeIcon size={16} />
                </IconButton>
              </Tooltip>
            ))}
          </Stack>
        );
      },
    },
    { field: "currentJobRole", headerName: "Current Job Role", flex: 0.9, minWidth: 140 },
    { field: "promotionType", headerName: "Promotion Type", flex: 0.8, minWidth: 130 },
    { field: "promotionCycle", headerName: "Promotion Cycle", flex: 0.8, minWidth: 130 },
    { field: "createdBy", headerName: "Created By", flex: 0.8, minWidth: 130 },
    { field: "createdOn", headerName: "Created On", flex: 0.7, minWidth: 110, valueFormatter: (value: string) => formatDate(value) },
    { field: "updatedBy", headerName: "Updated By", flex: 0.8, minWidth: 130 },
    { field: "updatedOn", headerName: "Updated On", flex: 0.7, minWidth: 110, valueFormatter: (value: string) => formatDate(value) },
  ];

  const HIDDEN_BY_DEFAULT = {
    declinedReason: false,
    currentJobRole: false,
    promotionType: false,
    promotionCycle: false,
    createdBy: false,
    createdOn: false,
    updatedBy: false,
    updatedOn: false,
  };

  if (cycle.isPending) return <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />;
  if (cycle.isError) {
    return (
      <PromotionEmptyState
        tone="error"
        message={`Unable to load the promotion cycle. ${humanizeHttpError(cycle.error)}`}
      />
    );
  }
  if (!cycle.cycle) {
    return <PromotionEmptyState message="There is no active promotion cycle" />;
  }

  if (sync.state === "IN_PROGRESS") {
    return <PromotionSyncStatusLabel message="Syncing time-based promotions..." />;
  }

  return (
    <>
      <ConfirmationDialog content={confirmImport} onClose={() => setConfirmImport(null)} />
      <PromotionFeedbackSnackbar feedback={feedback} onClose={close} />
      <GoogleSheetLinkDialog
        open={sheetDialogOpen}
        title="Insert Google Sheet Link"
        description="Employees will be imported and assigned promotions to based on their job band."
        onClose={() => setSheetDialogOpen(false)}
        onSubmit={(url) => {
          importPromotions.mutate(url, {
            onSuccess: () => notifySuccess("Import started."),
            onError: (error) => notifyError(`Unable to start the import. ${humanizeHttpError(error)}`),
          });
          setSheetDialogOpen(false);
        }}
      />
      <DeclinedReasonDialog
        title="Declined Reason"
        target={editingTarget}
        saving={updateRecommendation.isPending}
        onClose={() => {
          setEditingTarget(null);
          setEditingRecommendation(null);
        }}
        onSave={(text) => {
          if (!editingRecommendation) return;
          updateRecommendation.mutate(
            {
              id: editingRecommendation.recommendationID,
              statement: editingRecommendation.recommendationStatement ?? "",
              comment: encodePromotionText(text),
              leadEmail: editingRecommendation.leadEmail,
            },
            {
              onSuccess: () => {
                setEditingTarget(null);
                setEditingRecommendation(null);
                void requests.refetch();
                notifySuccess("Declined reason updated.");
              },
              onError: (error) => notifyError(`Unable to update the declined reason. ${humanizeHttpError(error)}`),
            },
          );
        }}
      />

      {requests.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : requests.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load promotion requests. ${humanizeHttpError(requests.error)}`}
        />
      ) : rows.length === 0 ? (
        // Empty-state / setup mode — source's own PAR App vs Google Sheet
        // bootstrap picker. PAR App is a UI-visible option in source's own
        // running app that has no backend implementation behind it yet
        // (source's own inline TODO) — kept selectable here for the same
        // reason: not reproducing it would silently drop something a real
        // admin can currently click, but confirming it is deliberately a
        // no-op, matching source exactly.
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, py: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            No time-based promotions exist for this cycle yet
          </Typography>
          <Grid container spacing={2} sx={{ maxWidth: 640 }}>
            <Grid size={6}>
              <Card variant="outlined">
                <CardActionArea onClick={() => setSource("par-app")} sx={{ p: 2, display: "flex", gap: 1 }}>
                  <Radio checked={source === "par-app"} />
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>PAR App</Typography>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                      Import employees who have 3 consecutive successful ratings or above
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
            <Grid size={6}>
              <Card variant="outlined">
                <CardActionArea onClick={() => setSource("sheet")} sx={{ p: 2, display: "flex", gap: 1 }}>
                  <Radio checked={source === "sheet"} />
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>Google Sheet</Typography>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                      Import list of employees from a Google Sheet
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadIcon size={16} />}
            onClick={() =>
              setConfirmImport({
                title: "Are you sure you want to import promotions?",
                text: "Employees who are eligible for promotions will be automatically assigned promotions for the coming cycle.",
                confirmLabel: "Yes",
                confirmAction: () => {
                  if (source === "sheet") setSheetDialogOpen(true);
                  // PAR App: no-op, matching source's own unimplemented path.
                },
              })
            }
          >
            Import
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<UploadIcon size={16} />}
              onClick={() => setSheetDialogOpen(true)}
            >
              Sync from sheet
            </Button>
          </Box>
          <Card variant="outlined" sx={{ p: 2 }}>
            <DataGrid.DataGrid
              rows={rows}
              columns={columns}
              // The Lead Status/Lead Email columns wrap onto a second line
              // for any row with more than one recommendation — a fixed
              // row height would clip it, so let the row grow to fit.
              getRowHeight={() => "auto"}
              showToolbar
              slots={{ toolbar: PromotionGridToolbar }}
              sx={{
                border: "none",
                ...GRID_NO_POINTER_FOCUS_SX,
                // Auto row height needs its own vertical padding; without it
                // the chips sit flush against the row divider.
                "& .MuiDataGrid-cell": { py: 1, alignItems: "center" },
              }}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
                columns: { columnVisibilityModel: HIDDEN_BY_DEFAULT },
              }}
              pageSizeOptions={[10, 25, 50]}
            />
          </Card>
        </>
      )}
    </>
  );
}
