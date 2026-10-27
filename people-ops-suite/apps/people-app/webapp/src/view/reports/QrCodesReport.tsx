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

import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

import CommonPage from "@layout/pages/CommonPage";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  alpha,
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { AppConfig } from "@config/config";
import { SEARCH_MAX_LENGTH, SEARCH_REGEX } from "@config/constant";
import { EmployeeStatus } from "@/types/types";
import {
  EmployeeQrInfo,
  fetchQrCodeEmployees,
} from "@slices/employeeSlice/employee";
import { useAppDispatch } from "@slices/store";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { APIService } from "@utils/apiService";
import { useEffect, useRef, useState } from "react";

// Each export is one request per employee to the QR service and one browser download,
// both serial, so the cap is about what that mechanism can carry rather than any server
// limit — there is none. Sized above a real joining cohort so it is not hit in normal
// use; a bulk export well beyond this wants a single server-generated archive instead.
const QR_EXPORT_LIMIT = 100;
const SEARCH_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase();
}

function QrCodesReportContent() {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const [selected, setSelected] = useState<EmployeeQrInfo[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [startDateLoading, setStartDateLoading] = useState(false);
  const [autocompleteKey, setAutocompleteKey] = useState(0);
  const [searchOptions, setSearchOptions] = useState<EmployeeQrInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSequenceRef = useRef(0);

  const selectedIds = new Set(selected.map((e) => e.employeeId));
  const atLimit = selected.length >= QR_EXPORT_LIMIT;
  const hasUnexportable = selected.some((e) => !e.house);

  async function performSearch(inputValue: string) {
    const seq = ++searchSequenceRef.current;
    setSearchLoading(true);
    const action = await dispatch(
      fetchQrCodeEmployees({
        ...(inputValue ? { searchString: inputValue } : {}),
        filters: { employeeStatus: EmployeeStatus.Active },
        pagination: { limit: SEARCH_LIMIT, offset: 0 },
        sort: { sortField: "startDate", sortOrder: "DESC" },
      }),
    );
    if (seq !== searchSequenceRef.current) return;
    if (fetchQrCodeEmployees.fulfilled.match(action)) {
      setSearchOptions(action.payload.employees);
    }
    setSearchLoading(false);
  }

  useEffect(() => {
    performSearch("");
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInputChange(_: unknown, inputValue: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Strip characters outside the backend-allowed pattern (e.g. parentheses from option labels)
    const sanitized = inputValue
      .split("")
      .filter((ch) => SEARCH_REGEX.test(ch))
      .join("")
      .trim()
      .slice(0, SEARCH_MAX_LENGTH);
    debounceRef.current = setTimeout(
      () => performSearch(sanitized),
      SEARCH_DEBOUNCE_MS,
    );
  }

  /**
   * Adds everyone who started on the chosen day to the export list.
   *
   * A joining cohort is the usual reason to print badges in bulk, and picking each
   * person out of the search one at a time is the slow path this avoids. Anyone already
   * selected is skipped rather than duplicated, and the export limit still applies —
   * the list is truncated to it and the surplus reported.
   */
  async function handleAddByStartDate() {
    if (!startDate) return;
    setStartDateLoading(true);
    try {
      const action = await dispatch(
        fetchQrCodeEmployees({
          filters: {
            employeeStatus: EmployeeStatus.Active,
            startDate,
          },
          // The export cap, not the type-ahead's limit: this asks for a whole cohort,
          // and anything beyond what the export can hold is reported as skipped below.
          // Requesting the dropdown's 20 silently returned a partial cohort and still
          // said it had added everyone.
          pagination: { limit: QR_EXPORT_LIMIT, offset: 0 },
          sort: { sortField: "startDate", sortOrder: "DESC" },
        }),
      );
      if (!fetchQrCodeEmployees.fulfilled.match(action)) return;

      const matches = action.payload.employees;
      if (matches.length === 0) {
        dispatch(
          enqueueSnackbarMessage({
            message: `No active employees started on ${startDate}.`,
            type: "warning",
          }),
        );
        return;
      }

      // Worked out before the update rather than inside it: a state updater has to be a
      // pure function of its argument, and React may run it more than once — StrictMode
      // does in development — which dispatched the snackbar twice. Reading `selected`
      // directly is safe here because this handler is awaited behind startDateLoading
      // and is the only writer while it runs.
      const existing = new Set(selected.map((e) => e.employeeId));
      const additions = matches.filter((e) => !existing.has(e.employeeId));
      const room = QR_EXPORT_LIMIT - selected.length;
      const added = additions.slice(0, Math.max(room, 0));

      // Two ways a cohort comes up short, and both have to be counted. The request asks
      // for QR_EXPORT_LIMIT rows, so a larger cohort is cut off by the server before the
      // client ever sees it: totalCount reports the real size. Counting only what came
      // back reported "Added 100" for a 120-person intake and never mentioned the other
      // twenty, leaving the admin to print badges for a cohort they thought was whole.
      const notReturned = Math.max(action.payload.totalCount - matches.length, 0);
      const skipped = additions.length - added.length + notReturned;

      setSelected((prev) => [...prev, ...added]);

      dispatch(
        enqueueSnackbarMessage({
          message:
            skipped > 0
              ? `Added ${added.length}; ${skipped} not added, the limit is ${QR_EXPORT_LIMIT}.`
              : `Added ${added.length} employee${added.length === 1 ? "" : "s"} who started on ${startDate}.`,
          type: skipped > 0 ? "warning" : "success",
        }),
      );
    } finally {
      setStartDateLoading(false);
    }
  }

  function handleSelect(_: unknown, value: EmployeeQrInfo | null) {
    if (!value || selectedIds.has(value.employeeId) || atLimit) return;
    setSelected((prev) => [...prev, value]);
    setAutocompleteKey((k) => k + 1);
  }

  function handleRemove(employeeId: string) {
    setSelected((prev) => prev.filter((e) => e.employeeId !== employeeId));
  }

  function handleClearAll() {
    setSelected([]);
  }

  async function handleDownload() {
    if (selected.length === 0 || isDownloading) return;
    setIsDownloading(true);
    const failed: string[] = [];
    for (const emp of selected) {
      try {
        const response = await APIService.getInstance().get(
          AppConfig.serviceUrls.employeeQrCode(emp.employeeId),
          { responseType: "blob" },
        );
        const url = URL.createObjectURL(response.data as Blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = `${emp.firstName}_${emp.lastName}`
          .replace(/[^\w\s-]/g, "")
          .trim();
        a.download = `${emp.employeeId}-${safeName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch {
        failed.push(`${emp.firstName} ${emp.lastName} (${emp.employeeId})`);
      }
    }
    if (failed.length > 0) {
      dispatch(
        enqueueSnackbarMessage({
          message: `Failed to export QR code for: ${failed.join(", ")}`,
          type: "error",
        }),
      );
    }
    setIsDownloading(false);
  }

  return (
    <Box sx={{ height: "100%", width: "100%", overflow: "auto" }}>
      {/* Info alert */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Alert
          severity="info"
          sx={{
            py: 0.5,
            fontSize: "0.875rem",
            "& .MuiAlert-icon": { alignItems: "center" },
          }}
        >
          Search for employees and add them to the list. Click{" "}
          <strong>Export QR Codes</strong> to save each QR as an individual PNG
          file. <br />A maximum of <strong>{QR_EXPORT_LIMIT} employees</strong>{" "}
          can be exported at a time.
        </Alert>
      </Box>

      <Box
        sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* Add a whole joining cohort at once: picking each person out of the search is
            the slow path when badges are printed for everyone who started on a day. */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <DatePicker
            label="Start date"
            format="YYYY-MM-DD"
            value={startDate ? dayjs(startDate) : null}
            disabled={atLimit || startDateLoading}
            onChange={(v: dayjs.Dayjs | null) =>
              setStartDate(v ? v.format("YYYY-MM-DD") : null)
            }
            slotProps={{
              field: { clearable: true },
              textField: {
                size: "small",
                sx: { minWidth: 200 },
              },
            }}
          />
          <Button
            variant="outlined"
            color="inherit"
            disabled={!startDate || atLimit || startDateLoading}
            onClick={handleAddByStartDate}
            startIcon={
              startDateLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <GroupAddIcon />
              )
            }
            // Styled as Clear All is: this is a list-management action alongside it,
            // not something competing with Export for attention.
            sx={{
              textTransform: "none",
              whiteSpace: "nowrap",
              color: "text.secondary",
              borderColor: "divider",
              height: 40,
            }}
          >
            {startDateLoading ? "Adding..." : "Add All"}
          </Button>
        </Box>
        <Typography
          color="text.secondary"
          sx={{ fontSize: 12, mt: -1.25, ml: 0.25 }}
        >
          Adds every active employee who started on that day to the list below.
        </Typography>
        {/* Search */}
        <Autocomplete
          key={autocompleteKey}
          options={searchOptions}
          getOptionLabel={(option) =>
            `${option.firstName} ${option.lastName} (${option.employeeId})`
          }
          filterOptions={(options) =>
            options.filter((o) => !selectedIds.has(o.employeeId))
          }
          onChange={handleSelect}
          onInputChange={handleInputChange}
          disabled={atLimit}
          loading={searchLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search employees"
              placeholder="Name, employee ID, or email"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searchLoading && <CircularProgress size={16} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              key={option.employeeId}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}
            >
              <Avatar
                src={option.employeeThumbnail ?? undefined}
                imgProps={{ referrerPolicy: "no-referrer" }}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: "0.75rem",
                  bgcolor: theme.palette.secondary.main,
                }}
              >
                {getInitials(option.firstName, option.lastName)}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {option.firstName} {option.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.workEmail} · {option.employeeId}
                </Typography>
              </Box>
            </Box>
          )}
          noOptionsText="No employees found"
        />

        {/* Selected employees card */}
        {selected.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              backgroundColor: "background.paper",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? theme.palette.grey[900]
                    : theme.palette.grey[100],
              }}
            >
              <Typography variant="body2" fontWeight={700}>
                Selected employees
              </Typography>
              <Typography
                variant="caption"
                fontWeight={700}
                color={atLimit ? "error" : "text.secondary"}
              >
                {selected.length} / {QR_EXPORT_LIMIT}
              </Typography>
            </Box>
            <Divider />

            {/* Employee rows */}
            {selected.map((emp, index) => {
              const missingHouse = !emp.house;
              return (
                <Box key={emp.employeeId}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      bgcolor: missingHouse
                        ? alpha(theme.palette.error.main, 0.06)
                        : "background.paper",
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        bgcolor: missingHouse
                          ? alpha(theme.palette.error.main, 0.1)
                          : theme.palette.action.hover,
                      },
                    }}
                  >
                    <Avatar
                      src={emp.employeeThumbnail ?? undefined}
                      imgProps={{ referrerPolicy: "no-referrer" }}
                      sx={{
                        width: 36,
                        height: 36,
                        fontSize: "0.8rem",
                        bgcolor: missingHouse
                          ? theme.palette.error.main
                          : theme.palette.secondary.main,
                        flexShrink: 0,
                      }}
                    >
                      {missingHouse ? (
                        <WarningAmberIcon sx={{ fontSize: 20 }} />
                      ) : (
                        getInitials(emp.firstName, emp.lastName)
                      )}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {emp.firstName} {emp.lastName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {emp.workEmail} · {emp.employeeId}
                      </Typography>
                      {missingHouse && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.25,
                          }}
                        >
                          <WarningAmberIcon sx={{ fontSize: 13 }} />
                          No house assigned — QR code cannot be generated
                        </Typography>
                      )}
                    </Box>
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        onClick={() => handleRemove(emp.employeeId)}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {index < selected.length - 1 && <Divider />}
                </Box>
              );
            })}
          </Paper>
        )}

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          {selected.length > 0 && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAll}
              disabled={isDownloading}
              sx={{
                textTransform: "none",
                color: "text.secondary",
                borderColor: "divider",
              }}
            >
              Clear All
            </Button>
          )}
          <Tooltip
            title={
              hasUnexportable
                ? "Remove employees with no house assigned before exporting"
                : ""
            }
          >
            <span>
              <Button
                variant="contained"
                color="secondary"
                startIcon={
                  isDownloading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DownloadIcon />
                  )
                }
                onClick={handleDownload}
                disabled={
                  selected.length === 0 || isDownloading || hasUnexportable
                }
                sx={{ textTransform: "none" }}
              >
                {isDownloading
                  ? "Exporting..."
                  : selected.length > 0
                    ? `Export QR Codes (${selected.length})`
                    : "Export QR Codes"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

export default function QrCodesReport() {
  return (
    <CommonPage
      title="QR Codes"
      icon={<QrCode2Icon />}
      commonPageTabs={[]}
      page={<QrCodesReportContent />}
    />
  );
}
