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

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import SearchIcon from "@mui/icons-material/Search";
import CommonPage from "@layout/pages/CommonPage";
import { BaseTextField } from "@component/common/FieldInput/BasicFieldInput/BaseTextField";
import { useAppDispatch, useAppSelector } from "@slices/store";
import { State } from "@/types/types";
import {
  CreateLeadershipGroupPayload,
  LeadershipGroupWithUsage,
  UpdateLeadershipGroupPayload,
  createLeadershipGroup,
  fetchAllLeadershipGroups,
  fetchLeadershipGroups,
  updateLeadershipGroup,
} from "@slices/leadershipSlice/leadership";
import LeadershipAttributeDialog from "./LeadershipAttributeDialog";

const SKELETON_ROW_COUNT = 3;

export default function LeadershipAttributeView() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { allGroups, allGroupsState } = useAppSelector((s) => s.leadership);
  const isLoading = allGroupsState === State.loading && allGroups.length === 0;

  const [searchText, setSearchText] = useState("");
  // "all" by default so retired attributes stay visible; they sort below the active ones.
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "retired">(
    "all",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadershipGroupWithUsage | null>(null);

  const refreshData = useCallback(() => {
    dispatch(fetchAllLeadershipGroups());
    // The active list backs the assignment dropdown and report filter elsewhere in the
    // app, so it is refreshed too rather than left stale until the next page load.
    dispatch(fetchLeadershipGroups());
  }, [dispatch]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const visible = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allGroups
      .filter((a) => {
        if (statusFilter === "active" && !a.isActive) return false;
        if (statusFilter === "retired" && a.isActive) return false;
        return !q || a.name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [allGroups, searchText, statusFilter]);

  const openDialog = (attribute: LeadershipGroupWithUsage | null) => {
    setEditing(attribute);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (
    payload: CreateLeadershipGroupPayload | UpdateLeadershipGroupPayload,
  ) => {
    if (editing) {
      await dispatch(
        updateLeadershipGroup({
          id: editing.id,
          payload: payload as UpdateLeadershipGroupPayload,
        }),
      ).unwrap();
    } else {
      await dispatch(
        createLeadershipGroup(payload as CreateLeadershipGroupPayload),
      ).unwrap();
    }
    refreshData();
  };

  return (
    <CommonPage
      title="Leadership Attributes"
      icon={<MilitaryTechIcon />}
      commonPageTabs={[]}
      page={
        <>
          <Box
            sx={{
              maxWidth: 640,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2,
                minHeight: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: theme.palette.background.paper,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.palette.text.primary,
                  letterSpacing: "0.04em",
                }}
              >
                Leadership Attributes
              </Typography>
              <Tooltip title="Add Leadership Attribute" arrow>
                <IconButton
                  size="small"
                  onClick={() => openDialog(null)}
                  aria-label="Add leadership attribute"
                  sx={{ color: theme.palette.primary.main }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Toolbar */}
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                display: "flex",
                gap: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <BaseTextField
                label="Search"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: searchText ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchText("")}
                        edge="end"
                        aria-label="Clear search"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <FormControl size="small" sx={{ width: 160 }}>
                <InputLabel sx={{ fontSize: 15 }}>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) =>
                    setStatusFilter(e.target.value as typeof statusFilter)
                  }
                  sx={{ fontSize: 15 }}
                >
                  <MenuItem value="all" sx={{ fontSize: 15 }}>
                    All
                  </MenuItem>
                  <MenuItem value="active" sx={{ fontSize: 15 }}>
                    Active
                  </MenuItem>
                  <MenuItem value="retired" sx={{ fontSize: 15 }}>
                    Retired
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Column headers */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                pl: 2,
                pr: 0.5,
                py: 0.75,
                backgroundColor: alpha(theme.palette.text.primary, 0.03),
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                sx={{ flex: 1, fontSize: 12, color: theme.palette.text.secondary }}
              >
                Name
              </Typography>
              <Typography
                title="Active and Marked-leaver employees holding this attribute"
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                  textAlign: "right",
                }}
              >
                Current holders
              </Typography>
              <Box sx={{ width: 38 }} aria-hidden="true" />
            </Box>

            {/* Rows */}
            {isLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                <Box key={i} sx={{ px: 2, py: 1.5 }}>
                  <Skeleton variant="text" width="60%" />
                </Box>
              ))
            ) : visible.length === 0 ? (
              <Typography
                sx={{
                  px: 2,
                  py: 3,
                  fontSize: 14,
                  color: theme.palette.text.secondary,
                  textAlign: "center",
                }}
              >
                No leadership attributes match.
              </Typography>
            ) : (
              visible.map((a) => (
                <Box
                  key={a.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 52,
                    pl: 2,
                    pr: 0.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    "&:last-of-type": { borderBottom: "none" },
                    "&:hover": { backgroundColor: theme.palette.action.hover },
                  }}
                >
                  <Typography
                    title={a.name}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 14,
                      color: a.isActive
                        ? theme.palette.text.primary
                        : theme.palette.text.disabled,
                      textDecoration: a.isActive ? "none" : "line-through",
                    }}
                  >
                    {a.name}
                  </Typography>
                  <Typography
                    sx={{
                      flexShrink: 0,
                      minWidth: 28,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 13,
                      color: a.holderCount
                        ? theme.palette.text.secondary
                        : theme.palette.text.disabled,
                    }}
                  >
                    {a.holderCount}
                  </Typography>
                  <Tooltip title="Edit" arrow>
                    <IconButton
                      size="small"
                      aria-label={`Edit ${a.name}`}
                      onClick={() => openDialog(a)}
                      sx={{ ml: 1 }}
                    >
                      <EditIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))
            )}
          </Box>
          <LeadershipAttributeDialog
            open={dialogOpen}
            onClose={closeDialog}
            onSubmit={handleSubmit}
            attribute={editing}
            allAttributes={allGroups}
          />
        </>
      }
    />
  );
}
