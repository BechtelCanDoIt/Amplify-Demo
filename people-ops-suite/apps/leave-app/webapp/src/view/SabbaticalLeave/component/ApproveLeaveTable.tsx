// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Box, Button, useTheme } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

import { useState } from "react";

import { getLeaveHistory } from "@root/src/services/leaveService";
import { approveLeaveAction } from "@root/src/slices/leaveSlice/leave";
import { useAppDispatch, useAppSelector } from "@root/src/slices/store";
import { selectUser } from "@root/src/slices/userSlice/user";
import { useConfirmationModalContext } from "@root/src/context/DialogContext";
import {
  Action,
  ConfirmationType,
  LeaveHistoryResponse,
  LeaveType,
  SingleLeaveHistory,
  State,
  Status,
} from "@root/src/types/types";

interface ApproveLeaveTableProps {
  rows: SingleLeaveHistory[];
  onRefresh?: () => void;
}

export default function ApproveLeaveTable({ rows, onRefresh }: ApproveLeaveTableProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const userInfo = useAppSelector(selectUser);
  const { showConfirmation } = useConfirmationModalContext();
  const [subordinateCount] = useState<number>(userInfo?.subordinateCount || 0);

  const handleOpenDialog = async (item: SingleLeaveHistory, isApproval: boolean) => {
    let percentage = "";
    try {
      const history: LeaveHistoryResponse = await getLeaveHistory({
        startDate: item.startDate,
        endDate: item.endDate,
        approverEmail: userInfo?.workEmail,
        leaveCategory: [LeaveType.SABBATICAL],
        statuses: [Status.APPROVED],
      });
      if (subordinateCount > 0) {
        const pct = Math.round((history.leaves.length / Number(subordinateCount)) * 100);
        percentage = ` ${pct}% of your team will be on sabbatical during this period.`;
      }
    } catch {}

    const dateRange = `${String(item.startDate ?? "").substring(0, 10)} – ${String(item.endDate ?? "").substring(0, 10)}`;

    showConfirmation(
      isApproval ? "Do you want to approve this leave?" : "Do you want to reject this leave?",
      isApproval
        ? `This will approve the sabbatical leave for ${item.email} (${dateRange}).${percentage}`
        : `This will reject the sabbatical leave request for ${item.email} (${dateRange}).`,
      ConfirmationType.accept,
      async () => {
        const result = await dispatch(
          approveLeaveAction({
            leaveId: String(item.id),
            action: isApproval ? Action.APPROVE : Action.REJECT,
          }),
        );
        if (approveLeaveAction.fulfilled.match(result)) {
          onRefresh?.();
        }
      },
      isApproval ? "Yes, Approve" : "Yes, Reject",
      "Cancel",
      undefined,
      isApproval
        ? "I confirm that I have reviewed and approved this sabbatical leave request and that appropriate " +
            "plans are in place to manage the employee's responsibilities, objectives and work commitments " +
            "during the leave period."
        : undefined,
    );
  };

  const columns: GridColDef[] = [
    {
      field: "email",
      headerName: "Employee",
      type: "string",
      flex: 1,
      editable: false,
    },
    {
      field: "startDate",
      headerName: "Start Date",
      type: "string",
      flex: 1,
      editable: false,
      renderCell: (params) => <span>{String(params.row?.startDate ?? "").substring(0, 10)}</span>,
    },
    {
      field: "endDate",
      headerName: "End Date",
      type: "string",
      flex: 1,
      editable: false,
      renderCell: (params) => <span>{String(params.row?.endDate ?? "").substring(0, 10)}</span>,
    },
    {
      field: "numberOfDays",
      headerName: "Day Count",
      type: "string",
      flex: 1,
      editable: false,
    },
    {
      field: "approval",
      headerName: "Approval",
      type: "actions",
      flex: 1.4,
      editable: false,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="space-around"
          alignItems="center"
          width="100%"
          height="100%"
        >
          <Button
            onClick={() => handleOpenDialog(params.row, true)}
            startIcon={<CheckCircleOutlineIcon />}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: "white",
              width: "40%",
              ":hover": { backgroundColor: theme.palette.primary.light },
            }}
          >
            Approve
          </Button>
          <Button
            onClick={() => handleOpenDialog(params.row, false)}
            startIcon={<CancelOutlinedIcon />}
            sx={{
              color: theme.palette.error.main,
              width: "40%",
              border: `1px solid ${theme.palette.error.main}`,
              ":hover": { backgroundColor: theme.palette.error.light, color: "white" },
            }}
          >
            Reject
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[5]}
        disableRowSelectionOnClick
        showToolbar
        slotProps={{
          columnsPanel: {
            sx: {
              "& .MuiTypography-root": {
                color: theme.palette.text.primary,
              },
            },
          },
        }}
      />
    </Box>
  );
}
