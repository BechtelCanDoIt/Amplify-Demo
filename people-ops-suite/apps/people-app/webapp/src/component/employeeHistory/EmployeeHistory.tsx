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

import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns/format";
import { isValid } from "date-fns/isValid";
import { parseISO } from "date-fns/parseISO";
import {
  alpha,
  Box,
  Chip,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { State } from "@/types/types";
import { useAppDispatch, useAppSelector } from "@slices/store";
import {
  EmploymentPeriod,
  fetchEmployeeHistory,
  HistoryEvent,
  PromotionRecord,
} from "@slices/employeeSlice/employeeHistory";

// Raw audit column names -> reader-facing labels. Keep in sync with the
// TRACKED_*_FIELDS lists in backend/modules/database/history.bal.
const FIELD_LABELS: Record<string, string> = {
  employee_id: "Employee ID",
  work_email: "Work Email",
  business_unit_id: "Business Unit",
  team_id: "Team",
  sub_team_id: "Sub-team",
  unit_id: "Unit",
  designation_id: "Designation",
  employment_type_id: "Employment Type",
  company_id: "Company",
  office_id: "Office",
  manager_email: "Reporting to",
  employee_status: "Employee Status",
  work_location: "Work Location",
  job_role: "Job Role",
  secondary_job_title: "Secondary Job Title",
  external_designation: "External Designation",
  house_id: "House",
  epf: "EPF Number",
  probation_end_date: "Probation End Date",
  agreement_end_date: "Agreement End Date",
  start_date: "Start Date",
  // personal_info fields
  nic_or_passport: "NIC / Passport",
  first_name: "First Name",
  last_name: "Last Name",
  title: "Title",
  dob: "Date of Birth",
  gender: "Gender",
  personal_email: "Personal Email",
  personal_phone: "Personal Phone",
  resident_number: "Resident Number",
  address_line_1: "Address Line 1",
  address_line_2: "Address Line 2",
  city: "City",
  state_or_province: "State / Province",
  postal_code: "Postal Code",
  country: "Country",
  nationality: "Nationality",
  // resignation_audit fields. Labelled as they appear in the Resignation Details
  // section, so a reader sees the same wording in the timeline and on the record.
  final_day_in_office: "Last Day in Office",
  final_day_of_employment: "Final Day of Employment",
  reason: "Resignation Reason",
  // resignation_audit: one event for the resignation being entered, rather than three
  // field changes for details that were entered together.
  resignation_recorded: "Resignation Recorded",
  // employee_additional_managers_audit
  additional_manager: "Additional Manager",
};

// Timeline filter categories. Relocations are deliberately absent: they are links
// between employment periods rather than events, so filtering to them alone would
// leave connectors with nothing between them.
type HistoryCategory = "employment" | "personal" | "promotion";

const CATEGORY_LABELS: Record<HistoryCategory, string> = {
  employment: "Employment",
  personal: "Personal Info",
  promotion: "Promotions",
};

const CATEGORY_ORDER: HistoryCategory[] = [
  "employment",
  "personal",
  "promotion",
];

// "all" is a view but not a category: it matches every row rather than tagging one.
type HistoryView = HistoryCategory | "all";

const fieldLabel = (field: string): string =>
  FIELD_LABELS[field] ??
  field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// occurredOn/promotedDate arrive as raw SQL date/timestamp strings (the audit
// tables use TIMESTAMP columns), so a strict yyyy-MM-dd parser would blank
// them out. Parse leniently and format for display only.
const formatEventDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = parseISO(value.includes(" ") ? value.replace(" ", "T") : value);
  return isValid(parsed) ? format(parsed, "d MMM yyyy") : value;
};

const statusChipColors = (theme: Theme, status: string) => {
  const normalized = status.trim().toLowerCase();
  const mainColor =
    normalized === "marked leaver"
      ? theme.palette.warning.main
      : normalized === "left"
        ? theme.palette.error.main
        : theme.palette.success.main;
  return {
    color: mainColor,
    backgroundColor: alpha(mainColor, theme.palette.mode === "dark" ? 0.18 : 0.12),
  };
};

// A single row rendered on the spine: either a field-level change, a
// synthetic "Joined" row derived from the period's start date, or a
// promotion.
interface TimelineRow {
  key: string;
  // What the date column displays. Nullable for promotions whose promoted date
  // was never recorded in HRIS — those show their cycle name instead.
  date: string | null;
  // What the row is ordered by, kept separate from what it displays. For a
  // promotion this is its created date, which is always present even when the
  // promoted date is not.
  sortKey: string;
  isPromo: boolean;
  isJoin: boolean;
  isSystem: boolean;
  // Which filter category this row belongs to. A "Joined" row has none: it is
  // structural, so it stays visible whatever filter is applied — otherwise a
  // filtered period would lose the row that anchors it.
  category: HistoryCategory | null;
  field: string;
  previousValue: string | null;
  currentValue: string | null;
  actionBy?: string;
  promotion?: PromotionRecord;
}

// Personal information belongs to the person, not to one employment: the backend
// stamps those rows with an anchor employment id, which is arbitrary. Attach them
// to the period whose date range contains them instead — the same rule promotions
// already follow — so they appear against the employment they happened during.
const ownsPersonalEvent = (
  period: EmploymentPeriod,
  periods: EmploymentPeriod[],
  occurredOn: string,
): boolean => {
  const containing = periods.find((candidate) => {
    const startedBy = occurredOn >= candidate.startDate;
    const endedAfter = candidate.endDate === null || occurredOn <= candidate.endDate;
    return startedBy && endedAfter;
  });
  // Outside every range (a change made after the last employment ended, say):
  // fall back to the most recent period so the event is never silently dropped.
  return containing ? containing.id === period.id : periods[0]?.id === period.id;
};

const buildRows = (
  period: EmploymentPeriod,
  events: HistoryEvent[],
  periods: EmploymentPeriod[],
): TimelineRow[] => {
  const rows: TimelineRow[] = [];

  events
    .filter((event) =>
      event.sourceTable === "personal_info_audit"
        ? ownsPersonalEvent(period, periods, event.occurredOn)
        : event.employeePkId === period.id,
    )
    .forEach((event, index) => {
      rows.push({
        key: `event-${period.id}-${index}`,
        date: event.occurredOn,
        sortKey: event.occurredOn,
        isPromo: false,
        isJoin: false,
        isSystem: event.isSystem,
        // Additional-manager rows come from their own audit table but read as an
        // employment change, so they sit under Employment rather than earning a
        // category with a single field in it.
        category:
          event.sourceTable === "personal_info_audit"
            ? "personal"
            : "employment",
        field: event.field,
        previousValue: event.previousValue,
        currentValue: event.currentValue,
        actionBy: event.actionBy,
      });
    });

  period.promotions.forEach((promotion, index) => {
    rows.push({
      key: `promo-${period.id}-${index}`,
      date: promotion.promotedDate,
      // Ordered by when the request was raised, not by the promoted date —
      // the latter is frequently null in HRIS.
      sortKey: promotion.createdOn,
      isPromo: true,
      isJoin: false,
      isSystem: false,
      category: "promotion",
      field: "Promotion",
      previousValue: promotion.currentJobBand,
      currentValue: promotion.nextJobBand,
      promotion,
    });
  });

  // Newest first, ordered by sortKey rather than the displayed date so a
  // promotion sits at the point its request was raised even when it displays
  // a cycle name instead of a date.
  rows.sort((a, b) =>
    a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0,
  );

  // The diff engine never emits a change event for the record that created
  // the employment row (an INSERT is a baseline, not a change), so "Joined"
  // is synthesized here from the period itself and always sits last.
  rows.push({
    key: `join-${period.id}`,
    date: period.startDate,
    sortKey: period.startDate,
    isPromo: false,
    isJoin: true,
    isSystem: false,
    category: null,
    field: "Joined",
    previousValue: null,
    currentValue: period.employmentType,
  });

  return rows;
};

const Dot = ({ isPromo, isJoin }: { isPromo: boolean; isJoin: boolean }) => (
  <Box sx={{ position: "relative", width: 32, height: 15, flexShrink: 0 }}>
    <Box
      sx={(theme) => ({
        position: "absolute",
        left: isPromo ? 10 : 11,
        top: isPromo ? 4 : 5,
        width: isPromo ? 9 : 7,
        height: isPromo ? 9 : 7,
        borderRadius: "50%",
        backgroundColor: isPromo
          ? theme.palette.secondary.contrastText
          : isJoin
            ? theme.palette.text.secondary
            : theme.palette.divider,
        boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
      })}
    />
  </Box>
);

const EventRow = ({ row }: { row: TimelineRow }) => {
  const theme = useTheme();
  const label = row.isJoin || row.isPromo ? row.field : fieldLabel(row.field);
  const isStatusField = row.field === "employee_status";
  const statusValue = (row.currentValue ?? "").trim().toLowerCase();
  const showStatusChip =
    isStatusField && (statusValue === "marked leaver" || statusValue === "left");

  return (
    <Box
      sx={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "32px 96px 1fr",
        alignItems: "baseline",
        gap: "0 14px",
        py: 1.125,
        borderTop: `1px solid ${theme.palette.divider}`,
        "&:first-of-type": { borderTop: "none" },
      }}
    >
      <Dot isPromo={row.isPromo} isJoin={row.isJoin} />
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {row.date
          ? formatEventDate(row.date)
          : (row.promotion?.cycleName ?? "-")}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "text.secondary",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            mb: 0.25,
          }}
        >
          {label}
        </Typography>

        {row.isJoin ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography sx={{ fontWeight: 550 }}>{row.currentValue}</Typography>
          </Stack>
        ) : row.isPromo ? (
          <>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography
                sx={{
                  color: "text.secondary",
                  textDecoration: "line-through",
                  textDecorationColor: theme.palette.divider,
                }}
              >
                {row.previousValue}
              </Typography>
              <Typography sx={{ color: "text.disabled" }}>{"→"}</Typography>
              <Typography sx={{ fontWeight: 550 }}>{row.currentValue}</Typography>
              <Chip
                size="small"
                label="Approved"
                sx={{
                  height: 20,
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.palette.secondary.contrastText,
                  backgroundColor: alpha(
                    theme.palette.secondary.contrastText,
                    theme.palette.mode === "dark" ? 0.18 : 0.12,
                  ),
                }}
              />
            </Stack>
            {row.promotion && (
              <Box
                sx={{
                  mt: 0.875,
                  p: 1.25,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  display: "flex",
                  flexWrap: "wrap",
                  columnGap: 2.25,
                  rowGap: 0.5,
                }}
              >
                {(
                  [
                    // The cycle name stands in for the date when HRIS has no
                    // promoted date, so it is only repeated here when a real
                    // date occupies the date column.
                    ...(row.date
                      ? [["Cycle", row.promotion.cycleName]]
                      : []),
                    ["Type", row.promotion.promotionType],
                    ["Role", row.promotion.jobRole],
                    // jobRole is nullable in HRIS; the `dd || "-"` fallback
                    // below is what renders a missing one.
                  ] as [string, string | null][]
                ).map(([dt, dd]) => (
                  <Box key={dt} sx={{ display: "flex", gap: 0.75 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {dt}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 550,
                        fontVariantNumeric: "tabular-nums",
                        color: "text.primary",
                      }}
                    >
                      {dd || "-"}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </>
        ) : (
          /* Three distinct shapes, not one: a value set for the first time, a
             value changed, and a value removed. Rendering a removal as
             "87 →" with nothing after the arrow reads as a bug rather than
             as a deliberate clearing. */
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {row.previousValue !== null && (
              <>
                <Typography
                  sx={{
                    color: "text.secondary",
                    textDecoration: "line-through",
                    textDecorationColor: theme.palette.divider,
                  }}
                >
                  {row.previousValue}
                </Typography>
                {row.currentValue !== null && (
                  <Typography sx={{ color: "text.disabled" }}>{"→"}</Typography>
                )}
              </>
            )}
            {row.currentValue === null ? (
              <Chip
                size="small"
                label="Removed"
                sx={{
                  height: 20,
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.palette.text.secondary,
                  backgroundColor: theme.palette.action.hover,
                }}
              />
            ) : showStatusChip ? (
              <Chip
                size="small"
                label={row.currentValue}
                sx={{
                  height: 20,
                  fontWeight: 600,
                  fontSize: 11,
                  ...statusChipColors(theme, row.currentValue),
                }}
              />
            ) : (
              <Typography sx={{ fontWeight: 550 }}>{row.currentValue}</Typography>
            )}
          </Stack>
        )}

        {row.actionBy && (
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.disabled", mt: 0.375 }}
          >
            by {row.actionBy}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// Bridges the gap between two employment periods joined by a relocation, so the
// link is drawn rather than described. Rendered above the period that carries the
// continuousServiceRecord, spanning down from the one before it.
const RelocationConnector = ({ label }: { label: string }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        py: 1.25,
        pl: 1.5,
        // The dashed rule sits on the same x as the event spine, so the eye
        // follows one continuous vertical through the join.
        "&::before": {
          content: '""',
          position: "absolute",
          left: 15,
          top: 0,
          bottom: 0,
          width: "1px",
          backgroundImage: `repeating-linear-gradient(to bottom, ${theme.palette.text.disabled} 0 3px, transparent 3px 7px)`,
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          ml: 2.75,
          px: 1.125,
          py: 0.375,
          borderRadius: 5,
          backgroundColor: theme.palette.action.hover,
          color: "text.secondary",
        }}
      >
        <LinkOutlinedIcon sx={{ fontSize: 13 }} />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
};

const PeriodSection = ({
  period,
  events,
  periods,
  view,
}: {
  period: EmploymentPeriod;
  events: HistoryEvent[];
  periods: EmploymentPeriod[];
  view: HistoryView;
}) => {
  const theme = useTheme();
  const rows = useMemo(
    () => buildRows(period, events, periods),
    [period, events, periods],
  );
  // A row with no category is structural ("Joined") and survives every filter,
  // so a filtered period keeps the row that anchors it rather than collapsing
  // to an empty block.
  const visibleRows = rows.filter(
    (row) =>
      !row.isSystem &&
      (view === "all" || row.category === null || row.category === view),
  );
  const systemCount = rows.filter((row) => row.isSystem).length;

  return (
    <Box sx={{ mb: 3.75 }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        flexWrap="wrap"
        sx={{ pb: 1.125, borderBottom: `1px solid ${theme.palette.divider}`, mb: 0.5 }}
      >
        <Typography sx={{ fontWeight: 640, fontSize: 14.5 }}>
          {period.employmentType}
        </Typography>
        {period.employeeId && (
          <Typography
            variant="caption"
            sx={{
              fontFamily:
                'ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace',
              color: "text.secondary",
              backgroundColor: theme.palette.action.hover,
              px: 0.75,
              py: 0.125,
              borderRadius: 0.5,
            }}
          >
            {period.employeeId}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
            ml: "auto",
          }}
        >
          {formatEventDate(period.startDate)} — {period.endDate ? formatEventDate(period.endDate) : "present"}
        </Typography>
      </Stack>


      <Box sx={{ position: "relative" }}>
        {visibleRows.map((row) => (
          <EventRow key={row.key} row={row} />
        ))}
      </Box>

      {systemCount > 0 && (
        <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.75 }}>
          SYSTEM · {systemCount} {systemCount === 1 ? "run" : "runs"} collapsed
        </Typography>
      )}
    </Box>
  );
};

export default function EmployeeHistory({ employeeId }: { employeeId: string }) {
  const dispatch = useAppDispatch();
  const { state, history, errorMessage } = useAppSelector((s) => s.employeeHistory);

  // Deliberately not persisted: a filter set days ago and forgotten is how a
  // reader concludes data is missing. Every open starts showing everything.
  // One active view rather than a set of toggles: "which view of this timeline"
  // is the question being answered, and it removes the awkward rule that the
  // last active category cannot be deselected. Not persisted — a filter set days
  // ago and forgotten is how a reader concludes data is missing.
  const [view, setView] = useState<HistoryView>("all");

  useEffect(() => {
    // Fetched only when nobody has already done so. The profile page fetches history
    // with the record, because the per-field controls beside each value read the same
    // response; this covers the remaining case, where the section is rendered without
    // that page having asked (a self-view, where field controls are not offered).
    // Resetting on unmount belongs to whoever owns the fetch, so it is not done here.
    if (employeeId && state === State.idle) {
      dispatch(fetchEmployeeHistory(employeeId));
    }
    // Deliberately not depending on `state`: it changes as the fetch resolves, and
    // re-running then would re-issue the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, dispatch]);

  // Declared above the early returns: hooks must run in the same order on every
  // render, and the loading/failed branches below return before this point.
  const counts = useMemo(() => {
    const tally: Record<HistoryCategory, number> = {
      employment: 0,
      personal: 0,
      promotion: 0,
    };
    (history?.events ?? []).forEach((event) => {
      if (event.isSystem) return;
      if (event.sourceTable === "personal_info_audit") tally.personal += 1;
      else tally.employment += 1;
    });
    (history?.periods ?? []).forEach((period) => {
      tally.promotion += period.promotions.length;
    });
    return tally;
  }, [history]);

  if (state === State.loading || state === State.idle) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 5 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Loading history...
        </Typography>
      </Stack>
    );
  }

  if (state === State.failed) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 5 }}>
        <Typography variant="body2" color="error">
          {errorMessage || "Failed to load employee history."}
        </Typography>
      </Stack>
    );
  }

  const periods = history?.periods ?? [];
  const events = history?.events ?? [];

  // How many rows each category would contribute, so a category with nothing in
  // it can be hidden rather than offered as an empty filter.
  // Categories with nothing in them are left out, but the row itself is shown
  // whenever any history exists — including when that leaves a single category.
  // Hiding it below two made the control appear and disappear between employees,
  // which reads as a bug rather than as an absence of anything to filter.
  const available = CATEGORY_ORDER.filter((category) => counts[category] > 0);
  const totalCount = CATEGORY_ORDER.reduce((sum, c) => sum + counts[c], 0);

  if (periods.length === 0 && events.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 5 }}>
        <HistoryOutlinedIcon sx={{ fontSize: 32, color: "text.disabled" }} />
        <Typography variant="body2" color="text.secondary">
          No events recorded yet.
        </Typography>
      </Stack>
    );
  }

  const sortedPeriods = [...periods].sort((a, b) =>
    a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0,
  );

  return (
    <Box>
      {history?.promotionsUnavailable && (
        <Box
          sx={(theme) => ({
            mb: 2.25,
            px: 1.625,
            py: 1.125,
            borderLeft: `2px solid ${theme.palette.warning.main}`,
            backgroundColor: alpha(
              theme.palette.warning.main,
              theme.palette.mode === "dark" ? 0.12 : 0.08,
            ),
            borderRadius: "0 6px 6px 0",
          })}
        >
          <Typography variant="body2" color="text.secondary">
            Promotion history is temporarily unavailable. The rest of the
            timeline below is unaffected.
          </Typography>
        </Box>
      )}

      {available.length > 0 && (
        <Tabs
          value={view}
          onChange={(_, next: HistoryView) => setView(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 0,
            mb: 2.5,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              minHeight: 0,
              minWidth: 0,
              px: 0,
              mr: 2.75,
              py: 1,
              fontSize: 13,
              fontWeight: 600,
              textTransform: "none",
              color: "text.secondary",
            },
            "& .Mui-selected": { color: "text.primary" },
          }}
        >
          {(["all", ...available] as HistoryView[]).map((option) => (
            <Tab
              key={option}
              value={option}
              label={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span>
                    {option === "all" ? "All" : CATEGORY_LABELS[option]}
                  </span>
                  <Box
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "text.disabled",
                      backgroundColor: "action.hover",
                      borderRadius: 4,
                      px: 0.625,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {option === "all" ? totalCount : counts[option]}
                  </Box>
                </Stack>
              }
            />
          ))}
        </Tabs>
      )}

      {sortedPeriods.map((period, index) => {
        // A period links backwards to the one it relocated from. Draw the
        // connector only when that target is the period directly below it, so
        // the line always spans a real adjacency rather than jumping a gap.
        const previous = sortedPeriods[index + 1];
        const linksToPrevious =
          period.continuousServiceRecord !== null &&
          previous !== undefined &&
          previous.employeeId === period.continuousServiceRecord;

        return (
          <Fragment key={period.id}>
            <PeriodSection
              period={period}
              events={events}
              periods={sortedPeriods}
              view={view}
            />
            {linksToPrevious && <RelocationConnector label="Relocation" />}
          </Fragment>
        );
      })}
    </Box>
  );
}
