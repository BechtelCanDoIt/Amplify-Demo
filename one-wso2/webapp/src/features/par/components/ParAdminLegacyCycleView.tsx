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

import { useCallback, useMemo, useState } from "react";
import { Box, Button, Card, Chip, DataGrid, IconButton, InputAdornment, Link, Skeleton, Stack, TextField, Tooltip, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useLeaveEmployees } from "@features/leave/api/useLeaveData";
import { useLegacyParHistoryByCycle } from "../api/useParAdmin";
import { useParLegacyHistory } from "../api/useLeadHistory";
import { formatShortDate } from "../util/parDate";
import { formatLegacyCycleName } from "../util/parLegacyHistory";
import { resolveLegacyRating } from "../util/legacyParRatingResolvers";
import { groupLegacyParticipantsByTeam, type LegacyTeamGroup } from "../util/parAdminHistory";
import ParEmptyState from "./ParEmptyState";
import ParLegacyRecordDetail from "./ParLegacyRecordDetail";
import { ParGridToolbar } from "./parGridToolbar";
import type { ParLegacyHistory } from "../api/types";

type Selection = { level: "groups" } | { level: "roster"; group: LegacyTeamGroup } | { level: "record"; group: LegacyTeamGroup; record: ParLegacyHistory };

function LegacyChip() {
  return <Chip label="Legacy" size="small" color="warning" variant="outlined" sx={{ ml: 1.5 }} />;
}

// Admin's breadcrumb trail is click-to-navigate text, but nothing here ever
// behaved like a dedicated "go back" affordance the way the employee
// History tab's own ArrowLeftIcon button does -- added the same button
// here, wired to the nearest parent level (the last breadcrumb item), so
// going back one level works the same way in both places.
function Breadcrumb({ items, current }: { items: { label: string; onClick: () => void }[]; current: string }) {
  const back = items[items.length - 1];
  return (
    <Stack spacing={1}>
      <Button size="small" startIcon={<ArrowLeftIcon size={14} />} onClick={back.onClick} sx={{ alignSelf: "flex-start" }}>
        Back
      </Button>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        {items.map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center" }}>
            <Link component="button" underline="hover" onClick={item.onClick} sx={{ mr: 0.5 }}>
              {item.label}
            </Link>
            <Typography component="span" sx={{ mx: 0.5 }}>
              /
            </Typography>
          </Box>
        ))}
        <Typography component="span" variant="h5">
          {current}
        </Typography>
        <LegacyChip />
      </Box>
    </Stack>
  );
}

// Admin Portal History tab's legacy-only drill-down: cycle -> team-like
// groups (department + reviewer, legacy data has no real team concept, see
// groupLegacyParticipantsByTeam) -> that group's records -> one record's
// full detail. Ports HistoryPanel.tsx's own three legacy view states, but as
// DataGrids throughout rather than plain MUI tables, matching how every
// other legacy-table screen in this port (e.g. ParOrgTeamViewTab.tsx) has
// already upgraded from source's plain tables.
export default function ParAdminLegacyCycleView({ cycleName, onBack }: { cycleName: string; onBack: () => void }) {
  const history = useLegacyParHistoryByCycle(cycleName);
  // No org-wide employee directory of our own — reuses Leave's for names and
  // avatars, same deviation ParOrgTeamRoster.tsx/ParLeadTeamRoster.tsx make;
  // legacy records only ever carry an email, never a name, for the employee
  // being reviewed.
  const employees = useLeaveEmployees();
  const employeeByEmail = useMemo(
    () => new Map(employees.data?.map((e) => [e.workEmail, e]) ?? []),
    [employees.data],
  );
  const nameFor = useCallback(
    (email: string) => {
      const e = employeeByEmail.get(email);
      return e ? `${e.firstName} ${e.lastName}` : email;
    },
    [employeeByEmail],
  );

  const [selection, setSelection] = useState<Selection>({ level: "groups" });
  // The roster/grouping fetch above is summary-only (see
  // useLegacyParHistoryByCycle's own comment) -- once a specific record is
  // opened, fetch that one employee's FULL legacy history (same endpoint
  // the self-view uses; admins are authorized for any employee) and pick out
  // the one cycle being viewed, rather than rendering the summary row with
  // its comments/questions/360-feedback already nulled out.
  const openedEmail = selection.level === "record" ? selection.record.employeeEmail : undefined;
  const openedRecordHistory = useParLegacyHistory(openedEmail, Boolean(openedEmail));
  // Matched by legacyHeaderId, not cycle name -- one employee can have more
  // than one row in the same cycle (e.g. a raw and a canonical 2015 cycle
  // name that both normalize to the same displayed name), and matching by
  // name alone could open one record's detail view with a different
  // record's comments/ratings/360 feedback.
  const openedFullRecord =
    selection.level === "record"
      ? openedRecordHistory.data?.find((r) => r.legacyHeaderId === selection.record.legacyHeaderId)
      : undefined;
  const [searchText, setSearchText] = useState("");

  // Every grid below must get a referentially-stable rows/columns array, or
  // DataGrid treats each render as "the data changed" and rebuilds its
  // internal row/column model from scratch -- that rebuild can land mid
  // click on the pagination arrows and swallow the click, making Next/
  // Previous page feel unresponsive. Recreating groups/columns inline on
  // every render (as this used to) is exactly that trap, so every one of
  // them is memoized here, unconditionally, before any early return.
  const groups = useMemo(() => groupLegacyParticipantsByTeam(history.data ?? []), [history.data]);
  const filteredGroups = useMemo(
    () =>
      searchText
        ? groups.filter((g) => Object.values(g).some((value) => typeof value !== "object" && String(value).toLowerCase().includes(searchText.toLowerCase())))
        : groups,
    [groups, searchText],
  );

  const rosterGroup = selection.level === "roster" ? selection.group : undefined;
  const rosterColumns = useMemo<DataGrid.GridColDef<ParLegacyHistory>[]>(
    () => [
      { field: "employeeEmail", headerName: "Employee", flex: 1.3, valueGetter: (_v, row) => nameFor(row.employeeEmail) },
      { field: "reviewerName", headerName: "Reviewer", flex: 1, valueGetter: (_v, row) => row.reviewerName ?? "-" },
      {
        field: "overallRating",
        headerName: "Overall Rating",
        flex: 1,
        // Same resolver ParLegacyRecordDetail uses, so a record can't show
        // a different rating here than once opened. Each cycle has its own
        // rating scale, so this can't be derived generically.
        valueGetter: (_v, row) =>
          resolveLegacyRating(formatLegacyCycleName(row.cycleName), row.managerScoreCode, []).rating ??
          row.overallRating ??
          "Not Assigned",
      },
      {
        field: "reviewCompletedDate",
        headerName: "Completed Date",
        flex: 1,
        // Raw value kept for sorting — formatShortDate's "D Mon 'YY" labels
        // would otherwise sort lexicographically, not chronologically.
        valueFormatter: (value: string | null) => (value ? formatShortDate(value) : "-"),
      },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        flex: 0.4,
        renderCell: (params) => (
          <Tooltip title="Open Record" arrow>
            <IconButton
              onClick={() => rosterGroup && setSelection({ level: "record", group: rosterGroup, record: params.row })}
            >
              <ArrowRightIcon size={18} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [nameFor, rosterGroup],
  );

  const teamColumns = useMemo<DataGrid.GridColDef<LegacyTeamGroup>[]>(
    () => [
      { field: "parBusinessUnit", headerName: "BU", flex: 1 },
      { field: "parDepartment", headerName: "Department", flex: 1 },
      { field: "parTeam", headerName: "Team", flex: 1 },
      { field: "parSubTeam", headerName: "Sub Team", flex: 1 },
      { field: "parLeadEmail", headerName: "Lead", flex: 1 },
      {
        field: "employeeParCompletion",
        headerName: "Employee PAR",
        flex: 0.7,
        renderCell: (params) => <Chip size="small" variant="outlined" label={params.row.employeeParCompletion} />,
      },
      {
        field: "leadFeedbackCompletion",
        headerName: "Lead's Feedback",
        flex: 0.7,
        renderCell: (params) => <Chip size="small" variant="outlined" label={params.row.leadFeedbackCompletion} />,
      },
      { field: "numberOf5pSlots", headerName: "5% Slots", flex: 0.5 },
      { field: "numberOf20pSlots", headerName: "20% Slots", flex: 0.5 },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        flex: 0.4,
        renderCell: (params) => (
          <Tooltip title="Open Group" arrow>
            <IconButton onClick={() => setSelection({ level: "roster", group: params.row })}>
              <ArrowRightIcon size={18} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  if (history.isLoading) {
    return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1.5 }} />;
  }
  if (history.isError) {
    return (
      <ErrorNotice error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching}>
        Couldn't load this legacy cycle's PAR history.
      </ErrorNotice>
    );
  }

  if (selection.level === "record") {
    const { group, record } = selection;
    return (
      <Stack spacing={2}>
        <Breadcrumb
          items={[
            { label: "History", onClick: onBack },
            { label: cycleName, onClick: () => setSelection({ level: "groups" }) },
            { label: group.parLeadEmail, onClick: () => setSelection({ level: "roster", group }) },
          ]}
          current={nameFor(record.employeeEmail)}
        />
        {openedRecordHistory.isLoading ? (
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1.5 }} />
        ) : openedRecordHistory.isError ? (
          <ErrorNotice
            error={openedRecordHistory.error}
            onRetry={() => openedRecordHistory.refetch()}
            retrying={openedRecordHistory.isFetching}
          >
            Couldn't load this employee's full legacy record.
          </ErrorNotice>
        ) : openedFullRecord ? (
          <ParLegacyRecordDetail
            record={openedFullRecord}
            thumbnail={employeeByEmail.get(record.employeeEmail)?.employeeThumbnail}
          />
        ) : (
          <ParEmptyState text="Couldn't find this employee's full legacy record." />
        )}
      </Stack>
    );
  }

  if (selection.level === "roster") {
    const { group } = selection;

    return (
      <Stack spacing={2}>
        <Breadcrumb
          items={[
            { label: "History", onClick: onBack },
            { label: cycleName, onClick: () => setSelection({ level: "groups" }) },
          ]}
          current={group.parLeadEmail}
        />
        <Card variant="outlined" sx={{ p: 2 }}>
          <DataGrid.DataGrid
            rows={group.participants}
            columns={rosterColumns}
            getRowId={(row) => row.legacyHeaderId}
            rowHeight={56}
            disableRowSelectionOnClick
            onRowClick={(params) => setSelection({ level: "record", group, record: params.row })}
            showToolbar
            slots={{ toolbar: ParGridToolbar }}
            sx={{ border: "none", "& .MuiDataGrid-row": { cursor: "pointer" } }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 20, 25]}
          />
        </Card>
      </Stack>
    );
  }

  if (groups.length === 0) {
    return (
      <Stack spacing={2}>
        <Breadcrumb items={[{ label: "History", onClick: onBack }]} current={cycleName} />
        <ParEmptyState text="No records found for this legacy cycle." />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Breadcrumb items={[{ label: "History", onClick: onBack }]} current={cycleName} />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <TextField
          size="small"
          placeholder="Search Team"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={16} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Card variant="outlined" sx={{ p: 2 }}>
        <DataGrid.DataGrid
          rows={filteredGroups}
          columns={teamColumns}
          rowHeight={56}
          disableRowSelectionOnClick
          onRowClick={(params) => setSelection({ level: "roster", group: params.row })}
          showToolbar
          slots={{ toolbar: ParGridToolbar }}
          sx={{ border: "none", "& .MuiDataGrid-row": { cursor: "pointer" } }}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          pageSizeOptions={[10, 20, 25]}
        />
      </Card>
    </Stack>
  );
}
