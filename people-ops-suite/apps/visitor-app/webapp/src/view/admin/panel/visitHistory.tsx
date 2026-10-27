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

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { Box, CircularProgress, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

import {
  RootState,
  useAppDispatch,
  useAppSelector,
} from "@root/src/slices/store";
import ErrorHandler from "@component/common/ErrorHandler";

import { fetchVisits } from "@slices/visitSlice/visit";

import { State, VisitStatus } from "@/types/types";

dayjs.extend(utc);
dayjs.extend(timezone);

const toLocalDateTime = (utcString: string) => {
  return dayjs
    .utc(utcString)
    .tz(dayjs.tz.guess())
    .format("YYYY-MM-DD HH:mm:ss");
};

const VisitHistory = () => {
  const dispatch = useAppDispatch();
  const { visits, state, stateMessage } = useAppSelector(
    (state: RootState) => state.visit,
  );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const visitsList = visits?.visits ?? [];
  const totalVisits = visits?.totalCount || 0;

  useEffect(() => {
    dispatch(
      fetchVisits({
        limit: pageSize,
        offset: page * pageSize,
        statusArray: [VisitStatus.completed, VisitStatus.rejected],
      }),
    );
  }, [dispatch, page, pageSize]);

  const columns: GridColDef[] = [
    {
      field: "firstName",
      headerName: "First Name",
      minWidth: 180,
      flex: 1.5,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "lastName",
      headerName: "Last Name",
      minWidth: 180,
      flex: 1.5,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "contactNumber",
      headerName: "Contact Number",
      minWidth: 150,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "email",
      headerName: "Visitor Email",
      minWidth: 200,
      flex: 1.5,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "passNumber",
      headerName: "Pass Number",
      minWidth: 120,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "purposeOfVisit",
      headerName: "Purpose",
      minWidth: 150,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "timeOfEntry",
      headerName: "Time Of Entry",
      minWidth: 150,
      flex: 1,
      renderCell: (params) =>
        params.value ? toLocalDateTime(params.value) : "N/A",
    },
    {
      field: "timeOfDeparture",
      headerName: "Time Of Departure",
      minWidth: 160,
      flex: 1.2,
      renderCell: (params) =>
        params.value ? toLocalDateTime(params.value) : "N/A",
    },
    { field: "status", headerName: "Status", minWidth: 120, flex: 1 },
  ];

  return (
    <Box>
      {state === State.loading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "80vh",
            width: "100%",
            py: 4,
          }}
        >
          <CircularProgress />
          <Typography mt={2} color="textSecondary">
            {state === State.loading
              ? stateMessage || "Loading, please wait..."
              : ""}
          </Typography>
        </Box>
      )}

      {state === State.failed ? (
        <ErrorHandler message={stateMessage || "Failed to load visits."} />
      ) : state === State.success ? (
        visitsList.length === 0 ? (
          <ErrorHandler message="No visits found." />
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr",
              paddingX: 2,
              paddingTop: 1,
            }}
          >
            <DataGrid
              pagination
              columns={columns}
              rows={visitsList}
              rowCount={totalVisits}
              paginationMode="server"
              pageSizeOptions={[5, 10, 20]}
              rowHeight={47}
              columnHeaderHeight={70}
              disableRowSelectionOnClick
              paginationModel={{ pageSize, page }}
              onPaginationModelChange={(model) => {
                setPageSize(model.pageSize);
                setPage(model.page);
              }}
              sx={{
                border: 0,
                width: "100%",
              }}
            />
          </Box>
        )
      ) : null}
    </Box>
  );
};

export default VisitHistory;
