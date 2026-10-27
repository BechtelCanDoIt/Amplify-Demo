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
  DEFAULT_LIMIT_VALUE,
  DEFAULT_OFFSET_VALUE,
  EmployeeGenders,
  SEARCH_MAX_LENGTH,
  SEARCH_REGEX,
} from "@config/constant";
import { FilterAltOutlined } from "@mui/icons-material";
import ClearIcon from "@mui/icons-material/Clear";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SearchIcon from "@mui/icons-material/Search";
import {
  Badge,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { BaseTextField } from "@root/src/component/common/FieldInput/BasicFieldInput/BaseTextField";
import type { EmployeeSearchPayload } from "@slices/employeeSlice/employee";
import { CURRENT_EMPLOYEE_STATUSES, isCurrentEmployeeStatusSet } from "@/types/types";
import { fetchManagers } from "@slices/employeeSlice/employee";
import {
  BusinessUnit,
  CareerFunction,
  Company,
  Designation,
  EmploymentType,
  fetchBusinessUnits,
  fetchCareerFunctions,
  fetchCompanies,
  fetchDesignations,
  fetchEmploymentTypes,
  fetchOffices,
  fetchSubTeams,
  fetchTeams,
  fetchUnits,
  Office,
  SubTeam,
  Team,
  Unit,
} from "@slices/organizationSlice/organization";
import { useAppDispatch, useAppSelector } from "@slices/store";
import { State } from "@src/types/types";
import { toSentenceCase, sortAndFormatOptions } from "@utils/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterChipSelect, FilterChipSelectProps } from "../employeesView/searchForm/FilterChipSelect";
import { FilterDrawer } from "../employeesView/searchForm/FilterDrawer";

type ChipMeta<K extends string, T> = { kind: K } & FilterChipSelectProps<T>;

type ChipConfig =
  | ChipMeta<"businessUnit", BusinessUnit>
  | ChipMeta<"team", Team>
  | ChipMeta<"subTeam", SubTeam>
  | ChipMeta<"unit", Unit>
  | ChipMeta<"careerFunction", CareerFunction>
  | ChipMeta<"designation", Designation>
  | ChipMeta<"manager", string>
  | ChipMeta<"company", Company>
  | ChipMeta<"office", Office>
  | ChipMeta<"employmentType", EmploymentType>
  | ChipMeta<"gender", string>;

interface MyTeamSearchFormProps {
  filterPayload: EmployeeSearchPayload;
  filtersAppliedOnce: boolean;
  teamActiveCount?: number | null;
  onFilterChange: (patch: Partial<EmployeeSearchPayload>) => void;
  onFiltersAppliedOnce: (value: boolean) => void;
}

export function MyTeamSearchForm({
  filterPayload,
  filtersAppliedOnce,
  teamActiveCount,
  onFilterChange,
  onFiltersAppliedOnce,
}: MyTeamSearchFormProps) {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const employeeState = useAppSelector((state) => state.employee);
  const { businessUnits, teams, subTeams, units, careerFunctions, designations, employmentTypes, companies, offices } =
    useAppSelector((state) => state.organization);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const [searchText, setSearchText] = useState(filterPayload.searchString ?? "");
  const [searchError, setSearchError] = useState(false);
  const [searchErrorReason, setSearchErrorReason] = useState<"format" | "length" | null>(null);

  useEffect(() => {
    setSearchText(filterPayload.searchString ?? "");
  }, [filterPayload.searchString]);

  useEffect(() => {
    dispatch(fetchManagers());
    dispatch(fetchEmploymentTypes());
    dispatch(fetchDesignations({}));
    dispatch(fetchBusinessUnits());
    dispatch(fetchCareerFunctions());
    dispatch(fetchCompanies());
    dispatch(fetchTeams({}));
    dispatch(fetchSubTeams({}));
    dispatch(fetchUnits({}));
    dispatch(fetchOffices({}));
  }, [dispatch]);

  const filterRef = useRef<EmployeeSearchPayload>(filterPayload);
  useEffect(() => {
    filterRef.current = filterPayload;
  }, [filterPayload]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const normalizeSearchString = (value?: string): string | undefined =>
    value === undefined ? undefined : value.trim().length > 0 ? value : undefined;

  const updateSearchPayload = useCallback(
    (patch: Partial<EmployeeSearchPayload>) => {
      const normalizedSearchString = normalizeSearchString(
        patch.searchString !== undefined ? patch.searchString : filterRef.current.searchString,
      );
      onFilterChange({
        searchString: normalizedSearchString,
        filters: { ...filterRef.current.filters, ...patch.filters },
        pagination: patch.pagination ?? filterRef.current.pagination,
        sort: patch.sort ?? filterRef.current.sort,
      });
    },
    [onFilterChange],
  );

  const clearAll = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    onFilterChange({
      searchString: normalizeSearchString(searchText),
      filters: {
        employeeStatuses: [...CURRENT_EMPLOYEE_STATUSES],
        directReports: false,
        excludeFutureStartDate: true,
      },
      pagination: { limit: DEFAULT_LIMIT_VALUE, offset: DEFAULT_OFFSET_VALUE },
      sort: filterRef.current.sort,
    });
  };

  // Filters beyond the default "Active + directReports" baseline (used for showing "Filtered" chip and "Clear filters" button).
  function hasNonBaselineFilters(filters: EmployeeSearchPayload["filters"]): boolean {
    const { businessUnitId, teamId, subTeamId, unitId, careerFunctionId, designationId, gender, employmentTypeId, managerEmail, companyId, officeId, excludeFutureStartDate } = filters;
    return Boolean(businessUnitId || teamId || subTeamId || unitId || careerFunctionId || gender || designationId || employmentTypeId || managerEmail || companyId || officeId || excludeFutureStartDate === false);
  }

  const activeFilterCount = useMemo(() => {
    const { businessUnitId, teamId, subTeamId, unitId, careerFunctionId, designationId, gender, employmentTypeId, managerEmail, companyId, officeId, employeeStatuses, directReports, excludeFutureStartDate } = filterPayload.filters;
    // Baseline (current employees, exclude future joiners) is the default — don't count it as an active filter.
    const isBaselineStatuses = isCurrentEmployeeStatusSet(employeeStatuses ?? []);
    const statusCount = isBaselineStatuses ? 0 : (employeeStatuses?.length ?? 0);
    // directReports defaults to false (show all); turning it on (Direct Reports Only) is an active filter.
    const directReportsOn = directReports === true;
    // excludeFutureStartDate defaults to true; only count it when the user opts to include future joiners.
    const includeFutureStartDateFilter = excludeFutureStartDate === false;
    return [businessUnitId, teamId, subTeamId, unitId, careerFunctionId, designationId, gender, employmentTypeId, managerEmail, companyId, officeId, statusCount || undefined, directReportsOn || undefined, includeFutureStartDateFilter || undefined].filter(Boolean).length;
  }, [filterPayload.filters]);

  const active = activeFilterCount > 0;
  const managerEmails = useMemo(() => employeeState.managers.map((m) => m.workEmail), [employeeState.managers]);

  // Shared style for the multi-select Status filter chips.
  const accentColor = theme.palette.secondary.contrastText;
  const multiFilterChipSx = {
    height: "32px",
    borderRadius: "50px",
    fontSize: "12px",
    fontWeight: 600,
    color: theme.palette.mode === "dark" ? theme.palette.grey[100] : theme.palette.grey[800],
    backgroundColor: alpha(accentColor, theme.palette.mode === "dark" ? 0.12 : 0.06),
    border: `1.5px solid ${accentColor}`,
    "& .MuiChip-deleteIcon": {
      color: theme.palette.text.disabled,
      "&:hover": { color: theme.palette.error.main },
    },
  };

  const filterChipConfigs = useMemo<ChipConfig[]>(
    () => [
      {
        kind: "businessUnit",
        label: "Business Unit",
        value: toSentenceCase(businessUnits.find((bu) => bu.id === filterPayload.filters.businessUnitId)?.name ?? ""),
        options: sortAndFormatOptions(businessUnits, (bu) => bu.name),
        getLabel: (bu: BusinessUnit) => toSentenceCase(bu.name),
        onChange: (bu: BusinessUnit) => updateSearchPayload({ filters: { businessUnitId: bu.id } }),
        onClear: () => updateSearchPayload({ filters: { businessUnitId: undefined } }),
      },
      {
        kind: "team",
        label: "Team",
        value: toSentenceCase(teams.find((t) => t.id === filterPayload.filters.teamId)?.name ?? ""),
        options: sortAndFormatOptions(teams, (t) => t.name),
        getLabel: (t: Team) => toSentenceCase(t.name),
        onChange: (t: Team) => updateSearchPayload({ filters: { teamId: t.id } }),
        onClear: () => updateSearchPayload({ filters: { teamId: undefined } }),
      },
      {
        kind: "subTeam",
        label: "Sub Team",
        value: toSentenceCase(subTeams.find((s) => s.id === filterPayload.filters.subTeamId)?.name ?? ""),
        options: sortAndFormatOptions(subTeams, (st) => st.name),
        getLabel: (s: SubTeam) => toSentenceCase(s.name),
        onChange: (s: SubTeam) => updateSearchPayload({ filters: { subTeamId: s.id } }),
        onClear: () => updateSearchPayload({ filters: { subTeamId: undefined } }),
      },
      {
        kind: "unit",
        label: "Unit",
        value: toSentenceCase(units.find((u) => u.id === filterPayload.filters.unitId)?.name ?? ""),
        options: sortAndFormatOptions(units, (u) => u.name),
        getLabel: (u: Unit) => toSentenceCase(u.name),
        onChange: (u: Unit) => updateSearchPayload({ filters: { unitId: u.id } }),
        onClear: () => updateSearchPayload({ filters: { unitId: undefined } }),
      },
      {
        kind: "careerFunction",
        label: "Career Function",
        value: toSentenceCase(careerFunctions.find((cf) => cf.id === filterPayload.filters.careerFunctionId)?.careerFunction ?? ""),
        options: sortAndFormatOptions(careerFunctions, (cf) => cf.careerFunction),
        getLabel: (cf: CareerFunction) => toSentenceCase(cf.careerFunction),
        onChange: (cf: CareerFunction) => updateSearchPayload({ filters: { careerFunctionId: cf.id } }),
        onClear: () => updateSearchPayload({ filters: { careerFunctionId: undefined } }),
      },
      {
        kind: "designation",
        label: "Designation",
        value: toSentenceCase(designations.find((d) => d.id === filterPayload.filters.designationId)?.designation ?? ""),
        options: sortAndFormatOptions(designations, (d) => d.designation),
        getLabel: (d: Designation) => toSentenceCase(d.designation),
        onChange: (d: Designation) => updateSearchPayload({ filters: { designationId: d.id } }),
        onClear: () => updateSearchPayload({ filters: { designationId: undefined } }),
      },
      {
        kind: "company",
        label: "Company",
        value: toSentenceCase(companies.find((c) => c.id === filterPayload.filters.companyId)?.name ?? ""),
        options: sortAndFormatOptions(companies, (c) => c.name),
        getLabel: (c: Company) => toSentenceCase(c.name),
        onChange: (c: Company) => updateSearchPayload({ filters: { companyId: c.id } }),
        onClear: () => updateSearchPayload({ filters: { companyId: undefined } }),
      },
      {
        kind: "office",
        label: "Office",
        value: toSentenceCase(offices.find((o) => o.id === filterPayload.filters.officeId)?.name ?? ""),
        options: sortAndFormatOptions(offices, (o) => o.name),
        getLabel: (o: Office) => toSentenceCase(o.name),
        onChange: (o: Office) => updateSearchPayload({ filters: { officeId: o.id } }),
        onClear: () => updateSearchPayload({ filters: { officeId: undefined } }),
      },
      {
        kind: "employmentType",
        label: "Employment Type",
        value: toSentenceCase(employmentTypes.find((et) => et.id === filterPayload.filters.employmentTypeId)?.name ?? ""),
        options: sortAndFormatOptions(employmentTypes, (et) => et.name),
        getLabel: (et: EmploymentType) => toSentenceCase(et.name),
        onChange: (et: EmploymentType) => updateSearchPayload({ filters: { employmentTypeId: et.id } }),
        onClear: () => updateSearchPayload({ filters: { employmentTypeId: undefined } }),
      },
      {
        kind: "manager",
        label: "Manager",
        value: managerEmails.find((e) => e === filterPayload.filters.managerEmail),
        options: sortAndFormatOptions(managerEmails, (e) => e),
        getLabel: (e: string) => e,
        onChange: (e: string) => updateSearchPayload({ filters: { managerEmail: e } }),
        onClear: () => updateSearchPayload({ filters: { managerEmail: undefined } }),
      },
      {
        kind: "gender",
        label: "Gender",
        value: toSentenceCase(filterPayload.filters.gender ?? ""),
        options: sortAndFormatOptions(EmployeeGenders, (g) => g),
        getLabel: (g: string) => toSentenceCase(g),
        onChange: (g: string) => updateSearchPayload({ filters: { gender: g } }),
        onClear: () => updateSearchPayload({ filters: { gender: undefined } }),
      },
    ],
    [
      businessUnits, careerFunctions, companies, designations, employmentTypes,
      filterPayload.filters.businessUnitId, filterPayload.filters.careerFunctionId,
      filterPayload.filters.companyId, filterPayload.filters.designationId,
      filterPayload.filters.employmentTypeId,
      filterPayload.filters.gender, filterPayload.filters.managerEmail,
      filterPayload.filters.officeId, filterPayload.filters.subTeamId,
      filterPayload.filters.teamId, filterPayload.filters.unitId,
      managerEmails, offices, subTeams, teams, units, updateSearchPayload,
    ],
  );

  const assertNever = (_x: never): never => { throw new Error("Unhandled chip kind"); };

  const hasActiveFilters = useMemo(() => hasNonBaselineFilters(filterPayload.filters), [filterPayload.filters]);
  const hasSearchString = !!filterPayload.searchString?.trim();
  const showFilteredCard = (filtersAppliedOnce && hasActiveFilters) || hasSearchString;
  const isLoading = employeeState.filteredEmployeesResponseState === State.loading;

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item width="100%" sx={{ display: "flex" }}>
          <Grid container justifyContent="flex-end" spacing={2} alignItems="center">
            {/* Left: title + count chips */}
            <Grid item flex={1}>
              <Stack display="flex" direction="row" alignItems="center" gap={1} sx={{ pl: 0.5 }}>
                <PeopleAltIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
                <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: "-0.3px" }}>
                  My Team
                </Typography>
                <Chip
                  size="small"
                  label={
                    <>
                      <Box
                        component="span"
                        sx={{
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          fontSize: "11px",
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          color: theme.palette.text.secondary,
                          textTransform: "capitalize",
                        }}
                      >
                        Total
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontSize: "14px",
                          fontWeight: 700,
                          lineHeight: 1,
                          color: theme.palette.mode === "dark" ? theme.palette.grey[100] : theme.palette.grey[800],
                        }}
                      >
                        {isLoading ? (
                          <Skeleton variant="rounded" width={24} height={14} />
                        ) : (
                          (teamActiveCount ?? "—")
                        )}
                      </Box>
                    </>
                  }
                  sx={{
                    ml: 1,
                    height: "auto",
                    borderRadius: "100px",
                    border: `1px solid ${theme.palette.text.disabled}`,
                    backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
                    "& .MuiChip-label": { padding: "6px 14px", display: "flex", alignItems: "center", gap: "8px" },
                  }}
                />
                {showFilteredCard && (
                  <Chip
                    size="small"
                    label={
                      <>
                        <Box
                          component="span"
                          sx={{
                            lineHeight: 1,
                            display: "flex",
                            alignItems: "center",
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            color: alpha(theme.palette.secondary.contrastText, 0.85),
                            textTransform: "capitalize",
                          }}
                        >
                          Filtered
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            fontSize: "14px",
                            fontWeight: 700,
                            lineHeight: 1,
                            color: theme.palette.mode === "dark" ? theme.palette.grey[100] : theme.palette.grey[800],
                          }}
                        >
                          {isLoading ? (
                            <Skeleton variant="rounded" width={24} height={14} />
                          ) : (
                            employeeState.filteredEmployeesResponse.totalCount
                          )}
                        </Box>
                      </>
                    }
                    sx={{
                      ml: 1,
                      height: "auto",
                      borderRadius: "100px",
                      border: `1px solid ${theme.palette.secondary.contrastText}`,
                      background: alpha(theme.palette.secondary.contrastText, 0.1),
                      "& .MuiChip-label": { padding: "6px 14px", display: "flex", alignItems: "center", gap: "8px" },
                    }}
                  />
                )}
              </Stack>
            </Grid>

            {/* Direct Reports toggle */}
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={filterPayload.filters.directReports === true}
                    onChange={(e) =>
                      updateSearchPayload({ filters: { directReports: e.target.checked } })
                    }
                    size="small"
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: theme.palette.secondary.contrastText,
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: theme.palette.secondary.contrastText,
                        opacity: 0.7,
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      color: filterPayload.filters.directReports === true
                        ? theme.palette.secondary.contrastText
                        : theme.palette.text.secondary,
                      fontSize: "0.8rem",
                      letterSpacing: 0.2,
                      whiteSpace: "nowrap",
                      pl: 0.5,
                    }}
                  >
                    Direct Reports Only
                  </Typography>
                }
                sx={{ mr: 1 }}
              />
            </Grid>

            {/* Center: search input */}
            <Grid item sx={{ display: "flex", width: "40%" }}>
              <BaseTextField
                id="searchString"
                size="small"
                name="searchString"
                label="Search"
                value={searchText}
                error={searchError}
                helperText={
                  searchError
                    ? searchErrorReason === "length"
                      ? `Maximum ${SEARCH_MAX_LENGTH} characters allowed`
                      : "Only letters, numbers, spaces and @ . _ - are allowed"
                    : undefined
                }
                inputProps={{ maxLength: SEARCH_MAX_LENGTH + 1 }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!SEARCH_REGEX.test(value)) {
                    setSearchErrorReason("format");
                    setSearchError(true);
                    return;
                  }
                  if (value.length > SEARCH_MAX_LENGTH) {
                    setSearchErrorReason("length");
                    setSearchError(true);
                    return;
                  }
                  setSearchErrorReason(null);
                  setSearchError(false);
                  setSearchText(value);
                  if (debounceRef.current) window.clearTimeout(debounceRef.current);
                  debounceRef.current = window.setTimeout(() => {
                    updateSearchPayload({ searchString: value });
                  }, 300);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: theme.palette.text.disabled }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Clear search"
                        edge="end"
                        size="small"
                        disabled={!searchText}
                        onClick={() => {
                          if (debounceRef.current) window.clearTimeout(debounceRef.current);
                          setSearchError(false);
                          setSearchErrorReason(null);
                          setSearchText("");
                          updateSearchPayload({ searchString: "" });
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.secondary.contrastText },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.secondary.contrastText },
                  },
                }}
              />
            </Grid>

            {/* Right: filter button */}
            <Grid item sx={{ display: "flex", pr: 0.5 }}>
              <Tooltip
                title={active ? `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active` : "Open filters"}
              >
                <Badge
                  badgeContent={activeFilterCount}
                  overlap="circular"
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: theme.palette.secondary.contrastText,
                      color: "#fff",
                      fontSize: "0.65rem",
                      height: 18,
                      minWidth: 18,
                      padding: "0 4px",
                      fontWeight: 700,
                      top: 3,
                      right: 3,
                    },
                  }}
                >
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => setDrawerOpen(true)}
                    startIcon={<FilterAltOutlined sx={{ fontSize: "18px !important" }} />}
                    sx={{
                      textTransform: "none",
                      height: "40px",
                      px: 2,
                      borderRadius: "8px",
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      backgroundColor: active ? alpha(theme.palette.secondary.contrastText, 0.06) : "transparent",
                      "&:hover": { backgroundColor: alpha(theme.palette.secondary.contrastText, 0.1) },
                    }}
                  >
                    Filters
                  </Button>
                </Badge>
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>

        {/* Active filter chips row */}
        <Grid item width="100%" sx={{ display: "flex", minHeight: filtersAppliedOnce ? 32 : 0 }}>
          {filtersAppliedOnce && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 2, width: "100%" }}>
              {filterChipConfigs.map((config) => {
                switch (config.kind) {
                  case "businessUnit": { const { kind, ...props } = config; return <FilterChipSelect<BusinessUnit> key={kind} {...props} />; }
                  case "team": { const { kind, ...props } = config; return <FilterChipSelect<Team> key={kind} {...props} />; }
                  case "subTeam": { const { kind, ...props } = config; return <FilterChipSelect<SubTeam> key={kind} {...props} />; }
                  case "unit": { const { kind, ...props } = config; return <FilterChipSelect<Unit> key={kind} {...props} />; }
                  case "careerFunction": { const { kind, ...props } = config; return <FilterChipSelect<CareerFunction> key={kind} {...props} />; }
                  case "designation": { const { kind, ...props } = config; return <FilterChipSelect<Designation> key={kind} {...props} />; }
                  case "company": { const { kind, ...props } = config; return <FilterChipSelect<Company> key={kind} {...props} />; }
                  case "office": { const { kind, ...props } = config; return <FilterChipSelect<Office> key={kind} {...props} />; }
                  case "employmentType": { const { kind, ...props } = config; return <FilterChipSelect<EmploymentType> key={kind} {...props} />; }
                  case "manager":
                  case "gender": { const { kind, ...props } = config; return <FilterChipSelect<string> key={kind} {...props} />; }
                  default: return assertNever(config);
                }
              })}
              {(filterPayload.filters.employeeStatuses ?? []).map((status) => (
                <Chip
                  key={`employeeStatus-${status}`}
                  label={`Status: ${toSentenceCase(status)}`}
                  variant="outlined"
                  onDelete={() => {
                    const next = (filterPayload.filters.employeeStatuses ?? []).filter(
                      (s) => s !== status,
                    );
                    updateSearchPayload({
                      filters: { employeeStatuses: next.length ? next : undefined },
                    });
                  }}
                  sx={multiFilterChipSx}
                />
              ))}
              {hasActiveFilters && (
                <Button
                  variant="text"
                  onClick={clearAll}
                  startIcon={<ClearIcon sx={{ fontSize: "14px !important" }} />}
                  sx={{
                    textTransform: "none",
                    height: "30px",
                    borderRadius: "50px",
                    px: 1.5,
                    fontSize: "12px",
                    fontWeight: 600,
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.secondary,
                    "&:hover": {
                      borderColor: theme.palette.error.main,
                      color: theme.palette.error.main,
                      backgroundColor: alpha(theme.palette.error.main, 0.05),
                    },
                  }}
                >
                  Clear filters
                </Button>
              )}
            </Stack>
          )}
        </Grid>
      </Grid>

      <FilterDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        setFiltersAppliedOnce={onFiltersAppliedOnce}
        appliedFilter={filterPayload}
        onApply={updateSearchPayload}
        clearAll={clearAll}
        businessUnits={businessUnits}
        teams={teams}
        subTeams={subTeams}
        units={units}
        careerFunctions={careerFunctions}
        designations={designations}
        employmentTypes={employmentTypes}
        managerEmails={managerEmails}
        companies={companies}
        offices={offices}
        showDirectReportsFilter
        multiSelectStatus
      />
    </Box>
  );
}
