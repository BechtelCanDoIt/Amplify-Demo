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

import {
  Box,
  Button,
  Dialog,
  Tooltip,
  IconButton,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
  CircularProgress,
  ListItem,
  Avatar,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import { useEffect, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Visibility, CorporateFare } from "@mui/icons-material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import List from "@mui/material/List";
import { useAppDispatch, useAppSelector } from "@slices/store";
import { fetchVisits, FloorRoom } from "@slices/visitSlice/visit";
import ErrorHandler from "@component/common/ErrorHandler";
import { State } from "@/types/types";

const toLocalDateTime = (utcString: string) => {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  return dayjs
    .utc(utcString)
    .tz(dayjs.tz.guess())
    .format("YYYY-MM-DD HH:mm:ss");
};

function VisitHistory() {
  const dispatch = useAppDispatch();
  const visits = useAppSelector((state) => state.visit);
  const totalMeetings = visits.visits?.totalCount || 0;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const visitsList = visits.visits?.visits ?? [];
  const [viewAccessibleFloors, setViewAccessibleFloors] = useState(false);
  const [accessibleFloors, setAccessibleFloors] = useState<FloorRoom[]>([]);
  const loginUserEmail = useAppSelector((state) => state.auth.userInfo?.email);

  const handleViewAccessibleFloors = (floorRooms: FloorRoom[]) => {
    console.log(floorRooms);
    setAccessibleFloors(floorRooms);
    setViewAccessibleFloors(true);
  };

  const columns: GridColDef[] = [
    {
      field: "timeOfEntry",
      headerName: "Time of Entry",
      minWidth: 150,
      flex: 1,
      renderCell: (params) =>
        params.value ? toLocalDateTime(params.value) : "N/A",
    },
    {
      field: "timeOfDeparture",
      headerName: "Time of Departure",
      minWidth: 150,
      flex: 1,
      renderCell: (params) =>
        params.value ? toLocalDateTime(params.value) : "N/A",
    },
    {
      field: "passNumber",
      headerName: "Pass Number",
      minWidth: 120,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
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
      minWidth: 160,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "email",
      headerName: "Email Address",
      minWidth: 200,
      flex: 2,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "purposeOfVisit",
      headerName: "Purpose of Visit",
      minWidth: 150,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "whomTheyMeet",
      headerName: "Whom They Meet",
      minWidth: 150,
      flex: 1,
      renderCell: (params) => params.value || "N/A",
    },
    {
      field: "accessibleLocations",
      headerName: "Accessible Floors",
      minWidth: 90,
      flex: 1,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <>
          <Tooltip title="View Attachments" arrow>
            <IconButton
              color="info"
              onClick={() =>
                handleViewAccessibleFloors(params.row.accessibleLocations)
              }
              disabled={
                !params.row.accessibleLocations ||
                params.row.accessibleLocations.length === 0
              }
            >
              <Visibility />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  useEffect(() => {
    dispatch(
      fetchVisits({
        limit: pageSize,
        offset: page * pageSize,
        inviter: loginUserEmail || "",
      }),
    );
  }, [dispatch, page, pageSize, loginUserEmail]);

  return (
    <Box>
      {visits.state === State.loading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "80vh",
            width: "100vw",
            py: 4,
          }}
        >
          <CircularProgress />
          <Typography mt={2} color="textSecondary">
            {visits.stateMessage}
          </Typography>
        </Box>
      ) : visits.state === State.failed ? (
        <ErrorHandler message={visits.stateMessage} />
      ) : visits.state === State.success ? (
        visitsList.length === 0 ? (
          <ErrorHandler message="Oops! Looks like there are no visits scheduled." />
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
              rowCount={totalMeetings}
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

      {/* View Accessible Floors Dialog */}
      <Dialog
        open={viewAccessibleFloors}
        onClose={() => setViewAccessibleFloors(false)}
      >
        <DialogTitle>Accessible Floors</DialogTitle>
        <DialogContent>
          {accessibleFloors.length === 0 ? (
            <Typography>
              Oops! Looks like there are no accessible floors.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 0.5 }}>
              <List
                sx={{
                  width: "100%",
                  maxWidth: 360,
                  bgcolor: "background.paper",
                }}
              >
                {accessibleFloors.map((floorRoom: FloorRoom, index: number) => (
                  <>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <CorporateFare />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<>{floorRoom.floor}</>}
                        secondary={
                          <>
                            {floorRoom.rooms.length > 0 ? (
                              floorRoom.rooms.map((room, i) => (
                                <>
                                  {room}
                                  {i === floorRoom.rooms.length - 1
                                    ? ""
                                    : ", "}{" "}
                                </>
                              ))
                            ) : (
                              <>All rooms </>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  </>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setViewAccessibleFloors(false)}
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VisitHistory;
