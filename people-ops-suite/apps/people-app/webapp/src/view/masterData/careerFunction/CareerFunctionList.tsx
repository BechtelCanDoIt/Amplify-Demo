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
import SearchIcon from "@mui/icons-material/Search";
import { useMemo, useState } from "react";
import { BaseTextField } from "@component/common/FieldInput/BasicFieldInput/BaseTextField";
import { CareerFunction, Designation } from "@slices/careerFunctionSlice/careerFunction";

const SKELETON_ROW_COUNT = 5;

interface CareerFunctionListProps {
  careerFunctions: CareerFunction[];
  designations: Designation[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onAdd: () => void;
  onEdit: (cf: CareerFunction) => void;
  isLoading: boolean;
}

export default function CareerFunctionList({
  careerFunctions,
  designations,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  isLoading,
}: CareerFunctionListProps) {
  const theme = useTheme();

  const [searchText, setSearchText] = useState("");
  // Default to "all" so inactive entries are visible without changing the filter; they
  // sort below the active ones rather than being hidden.
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Filter by status and name, then order active career functions first, with each
  // group sorted by name. Mirrors how HierarchyView orders its org-chart columns.
  const sortedCareerFunctions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return careerFunctions
      .filter((cf) => {
        if (statusFilter === "active" && !cf.isActive) return false;
        if (statusFilter === "inactive" && cf.isActive) return false;
        if (!q) return true;
        return cf.careerFunction.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.careerFunction.localeCompare(b.careerFunction);
      });
  }, [careerFunctions, searchText, statusFilter]);

  // Active employees across the orphan designations. The Unassigned row has no
  // activeEmployeeCount of its own, so it is summed from its designations here — the same
  // way the backend derives the figure for a real career function.
  const unassignedEmployeeCount = useMemo(
    () =>
      designations
        .filter((d) => d.careerFunctionId === null)
        .reduce((sum, d) => sum + d.activeEmployeeCount, 0),
    [designations],
  );

  // The Unassigned pseudo-entry ignores the status filter — orphan designations have no
  // active/inactive state of their own — but it still respects the search box, so typing
  // a real career function's name does not leave it dangling at the bottom.
  const showUnassigned = useMemo(() => {
    if (!designations.some((d) => d.careerFunctionId === null)) return false;
    const q = searchText.trim().toLowerCase();
    return !q || "unassigned".includes(q);
  }, [designations, searchText]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          minHeight: 56,
          maxHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
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
          Career Functions
        </Typography>
        <Tooltip title="Add Career Function" arrow>
          <IconButton size="small" onClick={onAdd} aria-label="Add career function" sx={{ color: theme.palette.primary.main }}>
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
          flexDirection: "column",
          gap: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <BaseTextField
          label="Search"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ width: "100%" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
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
        <FormControl size="small" fullWidth>
          <InputLabel sx={{ fontSize: 15 }}>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ fontSize: 15 }}
          >
            <MenuItem value="all" sx={{ fontSize: 15 }}>All</MenuItem>
            <MenuItem value="active" sx={{ fontSize: 15 }}>Active</MenuItem>
            <MenuItem value="inactive" sx={{ fontSize: 15 }}>Inactive</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Column headers — widths mirror the row layout below (flexible name, 28px
          right-aligned count, 30px action spacer) so the columns line up. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          pl: 2,
          pr: 0.5,
          py: 0.75,
          borderLeft: "3px solid transparent",
          backgroundColor:
            theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[100],
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: theme.palette.text.secondary,
          }}
        >
          Name
        </Typography>
        <Typography
          sx={{
            flexShrink: 0,
            ml: 1,
            minWidth: 28,
            textAlign: "right",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: theme.palette.text.secondary,
          }}
        >
          Emp.
        </Typography>
        <Box sx={{ flexShrink: 0, width: 30 }} aria-hidden="true" />
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 52,
                px: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Skeleton variant="rectangular" height={20} width="60%" sx={{ borderRadius: 1 }} />
              <Skeleton variant="circular" height={24} width={24} />
            </Box>
          ))
        ) : sortedCareerFunctions.length === 0 && !showUnassigned ? (
          <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 14, color: "text.disabled" }}>
              {careerFunctions.length === 0
                ? "No career functions yet."
                : "No career functions match."}
            </Typography>
          </Box>
        ) : (
          <>
            {sortedCareerFunctions.map((cf) => {
              const selected = selectedId === cf.id;
              return (
                // The row is a plain container. The selectable area and the edit control
                // are SIBLING buttons inside it — nesting a button in a button is invalid
                // HTML and makes click/keyboard delegation browser-dependent.
                <Box
                  key={cf.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 52,
                    pr: 0.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    borderLeft: selected
                      ? `3px solid ${theme.palette.primary.main}`
                      : "3px solid transparent",
                    backgroundColor: selected
                      ? theme.palette.action.selected
                      : alpha(theme.palette.background.paper, 0.5),
                    transition: "background-color 0.2s ease",
                    "&:hover": {
                      backgroundColor: selected
                        ? theme.palette.action.focus
                        : theme.palette.action.hover,
                      "& .career-function-actions": { opacity: 1 },
                    },
                    // Keyboard users tabbing to the edit button would otherwise land on an
                    // invisible control, since it is hidden until hover or selection.
                    "&:focus-within .career-function-actions": { opacity: 1 },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onSelect(cf.id)}
                    aria-pressed={selected}
                    sx={{
                      all: "unset",
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                      minWidth: 0,
                      alignSelf: "stretch",
                      pl: 2,
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <Typography
                      title={cf.careerFunction}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textAlign: "left",
                        fontSize: 14,
                        fontWeight: selected ? 600 : 400,
                        color: cf.isActive ? theme.palette.text.primary : theme.palette.text.disabled,
                        textDecoration: cf.isActive ? "none" : "line-through",
                      }}
                    >
                      {cf.careerFunction}
                    </Typography>
                    <Typography
                      title={`${cf.activeEmployeeCount} active employee${
                        cf.activeEmployeeCount === 1 ? "" : "s"
                      }`}
                      sx={{
                        flexShrink: 0,
                        ml: 1,
                        minWidth: 28,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 13,
                        color: cf.activeEmployeeCount
                          ? theme.palette.text.secondary
                          : theme.palette.text.disabled,
                      }}
                    >
                      {cf.activeEmployeeCount}
                    </Typography>
                  </Box>
                  <Box
                    className="career-function-actions"
                    sx={{
                      flexShrink: 0,
                      ml: 1,
                      opacity: selected ? 1 : 0,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <Tooltip title="Edit" arrow>
                      <IconButton
                        size="small"
                        aria-label={`Edit ${cf.careerFunction}`}
                        onClick={() => onEdit(cf)}
                      >
                        <EditIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}

            {showUnassigned && (
              <Box
                component="button"
                type="button"
                onClick={() => onSelect(null)}
                sx={{
                  all: "unset",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  boxSizing: "border-box",
                  minHeight: 52,
                  pl: 2,
                  pr: 0.5,
                  cursor: "pointer",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  borderLeft: selectedId === null
                    ? `3px solid ${theme.palette.primary.main}`
                    : "3px solid transparent",
                  backgroundColor:
                    selectedId === null
                      ? theme.palette.action.selected
                      : alpha(theme.palette.background.paper, 0.5),
                  transition: "background-color 0.2s ease",
                  "&:hover": {
                    backgroundColor:
                      selectedId === null ? theme.palette.action.focus : theme.palette.action.hover,
                  },
                }}
              >
                <Typography
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 14,
                    fontStyle: "italic",
                    fontWeight: selectedId === null ? 600 : 400,
                    color: theme.palette.text.primary,
                  }}
                >
                  Unassigned
                </Typography>
                <Typography
                  title={`${unassignedEmployeeCount} active employee${
                    unassignedEmployeeCount === 1 ? "" : "s"
                  }`}
                  sx={{
                    flexShrink: 0,
                    ml: 1,
                    minWidth: 28,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 13,
                    color: unassignedEmployeeCount
                      ? theme.palette.text.secondary
                      : theme.palette.text.disabled,
                  }}
                >
                  {unassignedEmployeeCount}
                </Typography>
                {/* Spacer matching the edit IconButton on real rows, so the count in this
                    row lines up with the counts above it. */}
                <Box sx={{ flexShrink: 0, width: 30 }} aria-hidden="true" />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
