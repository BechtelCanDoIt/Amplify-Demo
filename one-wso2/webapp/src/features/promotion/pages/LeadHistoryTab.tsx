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

// Every SUBMITTED/DECLINED/EXPIRED recommendation this lead has ever made,
// across every cycle (not scoped to the open one), narrowed to TIME_BASED.
// A data grid, matching the convention every other portal in this app
// already uses.
import { useState } from "react";
import { Card, Chip, DataGrid, IconButton, Skeleton, Tooltip } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { humanizeHttpError } from "@api/http";
import { useActivePromotionCycle } from "../api/usePromotionCycle";
import { useLeadRecommendations } from "../api/useLeadRecommendations";
import PromotionEmptyState from "../components/PromotionEmptyState";
import RecommendationHistoryDetailDialog from "../components/RecommendationHistoryDetailDialog";
import { PromotionGridToolbar } from "../components/PromotionGridToolbar";
import {
  promotionRequestChipColor,
  promotionRequestStatusLabel,
  recommendationChipColor,
  recommendationStatusLabel,
} from "../util/promotionStatus";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { PromotionRecommendation } from "../api/types";

export default function LeadHistoryTab() {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const leadEmail = userInfo.data?.workEmail ?? asgardeoUser.email;

  // Only for the "is this row's cycle still the open one" comparison each
  // row needs — a failed/loading fetch here just means every row reads as
  // not-active-cycle, which is never wrong for a row whose cycle really
  // has closed.
  const cycle = useActivePromotionCycle();

  const history = useLeadRecommendations(leadEmail, ["SUBMITTED", "DECLINED", "EXPIRED"]);
  const list = (history.data?.recommendations ?? []).filter((r) => r.promotionType === "TIME_BASED");

  const [viewing, setViewing] = useState<PromotionRecommendation | null>(null);

  const columns: DataGrid.GridColDef<PromotionRecommendation>[] = [
    { field: "employeeName", headerName: "Employee Name", flex: 1.2, minWidth: 160 },
    { field: "employeeEmail", headerName: "Employee Email", flex: 1.3, minWidth: 190 },
    { field: "promotionCycle", headerName: "Promotion Cycle", flex: 0.9, minWidth: 130 },
    {
      display: "flex",
      field: "recommendationStatus",
      headerName: "Lead Status",
      flex: 0.9,
      minWidth: 130,
      // The label, not the raw status, so filtering/sorting/export (which
      // all read `valueGetter`'s output, not `renderCell`'s) match what the
      // grid actually displays — a filter for "APPROVED" would otherwise
      // match nothing, since no row's raw status is ever literally APPROVED.
      valueGetter: (value) => recommendationStatusLabel(value),
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" color={recommendationChipColor(params.row.recommendationStatus)} />
      ),
    },
    {
      display: "flex",
      field: "promotionRequestStatus",
      headerName: "Promotion Status",
      flex: 0.9,
      minWidth: 150,
      valueGetter: (value, row) => promotionRequestStatusLabel(value, cycle.cycle?.id === row.promotionCycleId),
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" color={promotionRequestChipColor(params.value)} />
      ),
    },
    {
      display: "flex",
      field: "action",
      headerName: "",
      sortable: false,
      filterable: false,
      disableExport: true,
      width: 60,
      renderCell: (params) => {
        const canExpand =
          params.row.recommendationStatus === "SUBMITTED" || params.row.recommendationStatus === "DECLINED";
        return (
          canExpand && (
            <Tooltip title="View details">
              <IconButton size="small" onClick={() => setViewing(params.row)}>
                <ChevronDownIcon size={16} />
              </IconButton>
            </Tooltip>
          )
        );
      },
    },
  ];

  return (
    <>
      <RecommendationHistoryDetailDialog recommendation={viewing} onClose={() => setViewing(null)} />

      {history.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : history.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load recommendations history. ${humanizeHttpError(history.error)}`}
        />
      ) : list.length === 0 ? (
        <PromotionEmptyState message="There are no submitted requests!" />
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
