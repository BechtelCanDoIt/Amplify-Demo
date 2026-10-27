// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import React, { useState, useCallback } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Avatar from "@mui/material/Avatar";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import BusinessIcon from "@mui/icons-material/Business";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { useGet } from "../../services/useApi";
import { Endpoints } from "../../services/endpoints";
import { FetchVisitsResponse, FloorRoom } from "../../types/types";
import { useUserStore } from "../../stores/user/user";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import EmptyState from "../../components/Common/EmptyState";

dayjs.extend(utc);
dayjs.extend(timezone);

const toLocalDateTime = (utcString: string) => {
  return dayjs.utc(utcString).tz(dayjs.tz.guess()).format("MMM DD, hh:mm A");
};

const PAGE_SIZE = 10;

const statusChipProps = (status?: string) => {
  switch (status) {
    case "COMPLETED":
      return { bgcolor: "rgba(0,147,69,0.1)", color: "#009345" };
    case "CHECKED_IN":
      return { bgcolor: "#FFF3E8", color: "#FF7300" };
    case "CANCELLED":
      return { bgcolor: "rgba(237,27,36,0.1)", color: "#ED1B24" };
    default:
      return { bgcolor: "#E9EBF5", color: "#6C7496" };
  }
};

const iconSx = { fontSize: 14, color: "#7E87AD", flexShrink: 0 };

function VisitHistory() {
  const user = useUserStore((state) => state.user);
  const [page, setPage] = useState(0);
  const [showFloorsModal, setShowFloorsModal] = useState(false);
  const [accessibleFloors, setAccessibleFloors] = useState<FloorRoom[]>([]);

  const { data, isLoading, isError, error } = useGet<FetchVisitsResponse>(
    ["visits", page, user?.email],
    Endpoints.getVisits({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      inviter: user?.email || "",
    }),
    undefined,
    !!user?.email,
  );

  const visits = data?.visits ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleViewFloors = useCallback((floors: FloorRoom[]) => {
    setAccessibleFloors(floors);
    setShowFloorsModal(true);
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Loading visit history..." />;
  }

  if (isError) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 256,
        }}
      >
        <Typography variant="body2" sx={{ color: "#ED1B24" }}>
          {error?.message || "Failed to load visits"}
        </Typography>
      </Box>
    );
  }

  if (visits.length === 0 && page === 0) {
    return (
      <EmptyState
        title="No visits yet"
        subtitle="Visits you create will appear here"
      />
    );
  }

  return (
    <Box sx={{ px: 2, pt: 2, pb: 12, overflowY: "auto", height: "100%" }}>
      {/* Visit Cards */}
      <Stack spacing={1.5}>
        {visits.map((visit) => {
          const chipStyle = statusChipProps(visit.status);
          return (
            <Paper
              key={visit.id}
              variant="outlined"
              sx={{
                borderRadius: "12px",
                borderColor: "#E9EBF5",
                p: 2,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {/* Header Row */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonOutlineIcon sx={{ fontSize: 16, color: "#FF7300" }} />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "#3A3E50" }}
                  >
                    {visit.firstName || ""} {visit.lastName || ""}
                  </Typography>
                </Box>
                <Chip
                  label={visit.status?.replace(/_/g, " ") || "PENDING"}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.625rem",
                    fontWeight: 500,
                    bgcolor: chipStyle.bgcolor,
                    color: chipStyle.color,
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              </Box>

              {/* Visit Details */}
              <Stack
                spacing={0.75}
                sx={{ fontSize: "0.75rem", color: "#6C7496" }}
              >
                {visit.email && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EmailOutlinedIcon sx={iconSx} />
                    <Typography variant="caption" noWrap>
                      {visit.email}
                    </Typography>
                  </Box>
                )}

                {visit.contactNumber && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneOutlinedIcon sx={iconSx} />
                    <Typography variant="caption">
                      {visit.contactNumber}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarTodayOutlinedIcon sx={iconSx} />
                  <Typography variant="caption">
                    {visit.visitDate
                      ? dayjs(visit.visitDate).format("MMM DD, YYYY")
                      : "N/A"}
                  </Typography>
                </Box>

                {(visit.timeOfEntry || visit.timeOfDeparture) && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccessTimeIcon sx={iconSx} />
                    <Typography variant="caption">
                      {visit.timeOfEntry
                        ? toLocalDateTime(visit.timeOfEntry)
                        : "N/A"}
                      {" - "}
                      {visit.timeOfDeparture
                        ? toLocalDateTime(visit.timeOfDeparture)
                        : "N/A"}
                    </Typography>
                  </Box>
                )}

                {visit.purposeOfVisit && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <WorkOutlineIcon sx={iconSx} />
                    <Typography variant="caption" noWrap>
                      {visit.purposeOfVisit}
                    </Typography>
                  </Box>
                )}

                {visit.whomTheyMeet && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonOutlineIcon sx={iconSx} />
                    <Typography variant="caption" noWrap>
                      Meeting: {visit.whomTheyMeet}
                    </Typography>
                  </Box>
                )}
              </Stack>

              {/* Accessible Floors Button */}
              {visit.accessibleLocations &&
                visit.accessibleLocations.length > 0 && (
                  <Button
                    size="small"
                    startIcon={<LocationOnOutlinedIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleViewFloors(visit.accessibleLocations!)}
                    sx={{
                      mt: 1.5,
                      textTransform: "none",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#FF7300",
                      p: 0,
                      minWidth: 0,
                      "&:hover": { bgcolor: "transparent", color: "#FF8C33" },
                    }}
                  >
                    View Accessible Floors ({visit.accessibleLocations.length})
                  </Button>
                )}
            </Paper>
          );
        })}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            mt: 3,
          }}
        >
          <IconButton
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            size="small"
            sx={{ color: page === 0 ? "#8F9BBB" : "#4B5064" }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Typography variant="body2" sx={{ color: "#6C7496" }}>
            Page {page + 1} of {totalPages}
          </Typography>

          <IconButton
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            size="small"
            sx={{ color: page >= totalPages - 1 ? "#8F9BBB" : "#4B5064" }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      {/* Accessible Floors Modal */}
      <Dialog
        open={showFloorsModal}
        onClose={() => setShowFloorsModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "16px 16px 0 0",
            position: "fixed",
            bottom: 0,
            m: 0,
            maxHeight: "60vh",
            width: "100%",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E9EBF5",
            py: 1.5,
            px: 2,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, color: "#3A3E50" }}
          >
            Accessible Floors
          </Typography>
          <IconButton
            onClick={() => setShowFloorsModal(false)}
            size="small"
            sx={{ color: "#7E87AD" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {accessibleFloors.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: "#7E87AD", textAlign: "center", py: 2 }}
              >
                No accessible floors.
              </Typography>
            ) : (
              accessibleFloors.map((floorRoom, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: "12px",
                    bgcolor: "#FFFAF5",
                  }}
                >
                  <Avatar sx={{ width: 40, height: 40, bgcolor: "#FFF3E8" }}>
                    <BusinessIcon sx={{ color: "#FF7300", fontSize: 18 }} />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: "#3A3E50" }}
                    >
                      {floorRoom.floor}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#7E87AD", mt: 0.25, display: "block" }}
                    >
                      {floorRoom.rooms.length > 0
                        ? floorRoom.rooms.join(", ")
                        : "All rooms"}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default VisitHistory;
