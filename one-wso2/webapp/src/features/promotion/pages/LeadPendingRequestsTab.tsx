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

// Every REQUESTED recommendation for the open cycle, as a data grid —
// matching the convention every other portal in this app (Admin/Functional
// Lead/Promotion Board) already uses. "Start" opens the edit form in a
// dialog, the same "dialog on row action" pattern every other grid in this
// app uses, since MUI X DataGrid Community has no inline row-expansion.
import { useState } from "react";
import { Box, Card, Chip, DataGrid, IconButton, Popover, Skeleton, TextField, Tooltip, Typography } from "@wso2/oxygen-ui";
import { CheckIcon, PlayIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { humanizeHttpError } from "@api/http";
import { useActivePromotionCycle, isPromotionDeadlinePast } from "../api/usePromotionCycle";
import { useDeclineRecommendation, useLeadRecommendations } from "../api/useLeadRecommendations";
import { formatDate } from "../util/promotionHistory";
import PromotionDeadlineBanner from "../components/PromotionDeadlineBanner";
import PromotionEmptyState from "../components/PromotionEmptyState";
import { PromotionGridToolbar } from "../components/PromotionGridToolbar";
import RecommendationEditDialog from "../components/RecommendationEditDialog";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { PromotionRecommendation } from "../api/types";

function DeclineButton({ recommendationID }: { recommendationID: number }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [comment, setComment] = useState("");
  const decline = useDeclineRecommendation();

  return (
    <>
      <Tooltip title="Decline">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <XIcon size={16} />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Box sx={{ p: 2.5, width: 320 }}>
          <TextField
            fullWidth
            label="Reason for decline"
            multiline
            minRows={3}
            maxRows={6}
            slotProps={{ htmlInput: { maxLength: 250 } }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            {comment.length}/250
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
            <IconButton
              size="small"
              onClick={() => {
                setComment("");
                setAnchorEl(null);
              }}
            >
              <XIcon size={16} />
            </IconButton>
            <IconButton
              size="small"
              color="success"
              disabled={comment === "" || decline.isPending}
              onClick={() =>
                decline.mutate(
                  { id: recommendationID, comment },
                  { onSuccess: () => setAnchorEl(null) },
                )
              }
            >
              <CheckIcon size={16} />
            </IconButton>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

export default function LeadPendingRequestsTab() {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const leadEmail = userInfo.data?.workEmail ?? asgardeoUser.email;

  const cycle = useActivePromotionCycle();
  const deadlinePast = isPromotionDeadlinePast(cycle.cycle?.leadDeadline);

  const recommendations = useLeadRecommendations(
    leadEmail,
    ["REQUESTED"],
    cycle.cycle?.id,
    !cycle.isPending && Boolean(cycle.cycle) && !deadlinePast,
  );

  const [editing, setEditing] = useState<PromotionRecommendation | null>(null);
  const list = recommendations.data?.recommendations ?? [];

  const columns: DataGrid.GridColDef<PromotionRecommendation>[] = [
    {
      display: "flex",
      field: "employeeName",
      headerName: "Employee Name",
      flex: 1.3,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {params.value}
          {params.row.promotionType === "TIME_BASED" && (
            <Chip label="Time Based" size="small" variant="outlined" color="info" />
          )}
        </Box>
      ),
    },
    { field: "employeeEmail", headerName: "Employee Email", flex: 1.4, minWidth: 200 },
    { field: "promotionCycle", headerName: "Promotion Cycle", flex: 1, minWidth: 140 },
    {
      display: "flex",
      field: "action",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      disableExport: true,
      width: 110,
      renderCell: (params) => (
        <Box sx={{ display: "flex" }}>
          <Tooltip title="Start">
            <IconButton size="small" onClick={() => setEditing(params.row)}>
              <PlayIcon size={16} />
            </IconButton>
          </Tooltip>
          <DeclineButton recommendationID={params.row.recommendationID} />
        </Box>
      ),
    },
  ];

  return (
    <>
      <RecommendationEditDialog recommendation={editing} leadEmail={leadEmail ?? ""} onClose={() => setEditing(null)} />

      {cycle.cycle && !deadlinePast && (
        <PromotionDeadlineBanner>
          Please review (Approve / Reject) eligible employees before the deadline:{" "}
          {formatDate(cycle.cycle.leadDeadline)}
        </PromotionDeadlineBanner>
      )}

      {cycle.isPending || (recommendations.isPending && Boolean(cycle.cycle) && !deadlinePast) ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : cycle.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load the promotion cycle. ${humanizeHttpError(cycle.error)}`}
        />
      ) : !cycle.cycle ? (
        <PromotionEmptyState message="We are not accepting promotion requests right now" />
      ) : deadlinePast ? (
        <PromotionEmptyState message="The Lead deadline has passed." />
      ) : recommendations.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load recommendation requests. ${humanizeHttpError(recommendations.error)}`}
        />
      ) : list.length === 0 ? (
        <PromotionEmptyState message="There are no pending promotion requests." />
      ) : (
        <Card variant="outlined" sx={{ p: 2 }}>
          <DataGrid.DataGrid
            rows={list}
            getRowId={(row) => row.recommendationID}
            columns={columns}
            showToolbar
            slots={{ toolbar: PromotionGridToolbar }}
            sx={{ border: "none", ...GRID_NO_POINTER_FOCUS_SX }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      )}
    </>
  );
}
