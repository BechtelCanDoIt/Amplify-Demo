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
  Button,
  Chip,
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
import { BaseTextField } from "@component/common/FieldInput/BasicFieldInput/BaseTextField";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { PAGE_SIZE_OPTIONS } from "@config/constant";
import { Designation } from "@slices/careerFunctionSlice/careerFunction";

// Enough placeholder rows to fill a typical viewport while loading. Deliberately not
// tied to the page size (25) — that many skeleton rows would overflow the screen.
const SKELETON_ROW_COUNT = 10;

function SkeletonOverlay() {
  const theme = useTheme();
  return (
    <Box sx={{ width: "100%", pb: 1 }}>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 150px 110px 60px",
            alignItems: "center",
            height: 52,
            px: 2,
            gap: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Skeleton variant="rectangular" height={20} width="65%" sx={{ borderRadius: 1 }} />
          {/* Job Band and Active Employees are right-aligned columns, so their
              placeholders sit right too — otherwise the rows visibly shift on load. */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Skeleton variant="rectangular" height={20} width="50%" sx={{ borderRadius: 1 }} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Skeleton variant="rectangular" height={20} width="40%" sx={{ borderRadius: 1 }} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Skeleton variant="rounded" height={24} width={72} sx={{ borderRadius: 2 }} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Skeleton variant="circular" height={28} width={28} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

interface DesignationGridProps {
  designations: Designation[];
  careerFunctionName: string;
  isUnassigned: boolean;
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (d: Designation) => void;
}

const DESIGNATION_PAGE_SIZE = 25;

export default function DesignationGrid({
  designations,
  careerFunctionName,
  isUnassigned,
  isLoading,
  onAdd,
  onEdit,
}: DesignationGridProps) {
  const theme = useTheme();
  const [searchText, setSearchText] = useState("");
  // Default to "all" so inactive entries are visible without changing the filter; they
  // sort below the active ones rather than being hidden.
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredDesignations = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return designations
      .filter((d) => {
        if (statusFilter === "active" && !d.isActive) return false;
        if (statusFilter === "inactive" && d.isActive) return false;
        if (!q) return true;
        return d.designation.toLowerCase().includes(q);
      })
      // Active designations first, then inactive ones. Within each group, order by job
      // band ascending so the career ladder reads bottom-up, with band-less designations
      // last (a null band is "unset", not band zero) and name as the tiebreaker.
      // Sorting only reorders rows, so the summary stats derived from this list are
      // unaffected. The user can still re-sort any column via the DataGrid header.
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (a.jobBand !== b.jobBand) {
          if (a.jobBand === null) return 1;
          if (b.jobBand === null) return -1;
          return a.jobBand - b.jobBand;
        }
        return a.designation.localeCompare(b.designation);
      });
  }, [designations, searchText, statusFilter]);

  const totalActiveEmployees = useMemo(
    () => filteredDesignations.reduce((sum, d) => sum + d.activeEmployeeCount, 0),
    [filteredDesignations],
  );

  const jobBandRange = useMemo(() => {
    const bands = filteredDesignations
      .map((d) => d.jobBand)
      .filter((band): band is number => band !== null);
    if (bands.length === 0) return "—";
    const distinctBands = Array.from(new Set(bands));
    if (distinctBands.length === 1) return `${distinctBands[0]}`;
    const min = Math.min(...bands);
    const max = Math.max(...bands);
    return `${min}–${max}`;
  }, [filteredDesignations]);

  const columns: GridColDef<Designation>[] = useMemo(
    () => [
      {
        field: "designation",
        headerName: "Designation",
        flex: 1,
        minWidth: 180,
        resizable: false,
      },
      {
        field: "jobBand",
        headerName: "Job Band",
        width: 110,
        align: "right",
        headerAlign: "right",
        resizable: false,
        renderCell: (params: GridRenderCellParams<Designation>) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", width: "100%", textAlign: "right" }}>
            {params.value === null ? "—" : params.value}
          </Box>
        ),
      },
      {
        field: "activeEmployeeCount",
        headerName: "Active Employees",
        width: 150,
        align: "right",
        headerAlign: "right",
        resizable: false,
        renderCell: (params: GridRenderCellParams<Designation>) => (
          <Box
            sx={{
              width: "100%",
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
              color: params.value > 0 ? theme.palette.text.primary : theme.palette.text.disabled,
            }}
          >
            {params.value}
          </Box>
        ),
      },
      {
        field: "isActive",
        headerName: "Status",
        width: 110,
        resizable: false,
        renderCell: (params: GridRenderCellParams<Designation>) => (
          <Chip
            label={params.value ? "Active" : "Inactive"}
            size="small"
            color={params.value ? "success" : "error"}
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: "0.7rem", height: 24, borderRadius: 2 }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        resizable: false,
        renderCell: (params: GridRenderCellParams<Designation>) => (
          <Tooltip title="Edit Designation" arrow>
            <IconButton
              size="small"
              aria-label="Edit Designation"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(params.row);
              }}
              sx={{ color: theme.palette.primary.main }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [onEdit, theme],
  );

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: theme.palette.text.secondary, fontWeight: 700, letterSpacing: 1 }}
        >
          {isUnassigned ? "Designations" : "Career Function"}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {careerFunctionName}
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {/* Held back while loading: the slice keeps the previous rows during a
              refresh, so these would show stale counts above a skeleton table. */}
          {isLoading
            ? "—"
            : `${filteredDesignations.length} designations · ${totalActiveEmployees} active employees`}
        </Typography>
      </Box>

      {/* Summary strip */}
      <Box sx={{ display: "flex", gap: 4, px: 2, py: 2 }}>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Designations
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isLoading ? "—" : filteredDesignations.length}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Active Employees
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {isLoading ? "—" : totalActiveEmployees}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Job Bands
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {isLoading ? "—" : jobBandRange}
          </Typography>
        </Box>
      </Box>

      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
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
          <BaseTextField
            label="Search"
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: { xs: "100%", md: 240 } }}
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
          {!isUnassigned && (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAdd}
              sx={{ textTransform: "none" }}
            >
              Add Designation
            </Button>
          )}
        </Box>
      </Box>

      {/* Table */}
      <Box sx={{ flex: 1, px: 2, pb: 2 }}>
        <DataGrid
          rows={isLoading ? [] : filteredDesignations}
          columns={columns}
          loading={isLoading}
          localeText={{ noRowsLabel: "No designations found." }}
          initialState={{
            // A career function's designation list is short (a couple of dozen at most),
            // so page at 25 rather than the app-wide default of 10 — otherwise inactive
            // designations, which sort last, fall onto page 2 and look missing.
            pagination: { paginationModel: { pageSize: DESIGNATION_PAGE_SIZE } },
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          slots={{ loadingOverlay: SkeletonOverlay }}
          disableRowSelectionOnClick
          disableColumnMenu
          sx={{
            width: "100%",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor:
                theme.palette.mode === "dark"
                  ? theme.palette.grey[800]
                  : theme.palette.grey[100],
              fontSize: "0.875rem",
              fontWeight: 700,
              color: theme.palette.text.primary,
              borderBottom: 0,
              minHeight: "56px !important",
              maxHeight: "56px !important",
            },
            "& .MuiDataGrid-columnHeader": {
              borderBottom: 0,
              backgroundColor: theme.palette.background.paper,
              "&:focus, &:focus-within": {
                outline: "none",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 700,
            },
            "& .MuiDataGrid-virtualScroller": {
              // No fixed reserve while loading: the grid already fills a height:100%
              // flex container, and a row-count-derived min-height would either
              // under-reserve (page size is 25, not DEFAULT_LIMIT_VALUE) or overflow
              // the viewport. Letting it fill avoids a jump when rows arrive.
              ...(isLoading && { minHeight: "100% !important" }),
            },
            "& .MuiDataGrid-cell": {
              display: "flex",
              alignItems: "center",
              fontSize: "0.875rem",
              py: 1.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              borderTop: 0,
              "&:focus, &:focus-within": {
                outline: "none",
              },
            },
            "& .MuiDataGrid-row": {
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
              transition: "background-color 0.2s ease",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
              "&.Mui-selected": {
                backgroundColor: theme.palette.action.selected,
                "&:hover": {
                  backgroundColor: theme.palette.action.focus,
                },
              },
            },
            "& .MuiDataGrid-filler": {
              display: "none",
            },
            "& .MuiDataGrid-footerContainer": {
              backgroundColor: theme.palette.background.paper,
              border: 0,
              borderRadius: "0 0 0.25rem 0.25rem",
              minHeight: "52px",
            },
          }}
          slotProps={{
            pagination: {
              labelRowsPerPage: "Rows per page:",
            },
          }}
        />
      </Box>
    </Box>
  );
}
