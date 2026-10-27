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
import GroupsIcon from "@mui/icons-material/Groups";
import SearchIcon from "@mui/icons-material/Search";
import {
  Badge,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { BaseTextField } from "@root/src/component/common/FieldInput/BasicFieldInput/BaseTextField";
import type { EmployeeSearchPayload } from "@slices/employeeSlice/employee";
import { CURRENT_EMPLOYEE_STATUSES } from "@/types/types";
import {
  fetchManagers,
  setEmployeeFilter,
  setFilterAppliedOnce,
} from "@slices/employeeSlice/employee";
import {
  BusinessUnit,
  CareerFunction,
  Company,
  Designation,
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
import { FilterChipSelect, FilterChipSelectProps } from "./FilterChipSelect";
import { FilterDrawer } from "./FilterDrawer";

type ChipMeta<K extends string, T> = { kind: K } & FilterChipSelectProps<T>;

// Add the new filter chip to this union type when a new filter chip is added in the SearchForm
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
  | ChipMeta<"gender", string>;

export function SearchForm() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const employeeState = useAppSelector((state) => state.employee);
  const filterPayload = employeeState.employeeFilter as EmployeeSearchPayload;
  const filtersAppliedOnce = useAppSelector(
    (state) => state.employee.filterAppliedOnce,
  );

  const {
    businessUnits,
    teams,
    subTeams,
    units,
    careerFunctions,
    designations,
    employmentTypes,
    companies,
    offices,
  } = useAppSelector((state) => state.organization);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const [searchText, setSearchText] = useState(
    filterPayload.searchString ?? "",
  );
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

  const normalizeSearchString = (value?: string): string | undefined => {
    if (value === undefined) return undefined;
    return value.trim().length > 0 ? value : undefined;
  };

  const updateSearchPayload = useCallback(
    (patch: Partial<EmployeeSearchPayload>) => {
      const normalizedSearchString = normalizeSearchString(
        patch.searchString !== undefined
          ? patch.searchString
          : filterRef.current.searchString,
      );
      const nextPayload = {
        searchString: normalizedSearchString,
        filters: {
          ...filterRef.current.filters,
          ...patch.filters,
        },
        pagination: patch.pagination ?? filterRef.current.pagination,
        sort: patch.sort ?? filterRef.current.sort,
      };
      dispatch(setEmployeeFilter(nextPayload));
    },
    [dispatch],
  );

  const clearAll = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const normalizedSearchString = normalizeSearchString(searchText);
    dispatch(
      setEmployeeFilter({
        searchString: normalizedSearchString,
        filters: {
          employeeStatuses: [...CURRENT_EMPLOYEE_STATUSES],
          excludeFutureStartDate: true,
        },
        pagination: {
          limit: DEFAULT_LIMIT_VALUE,
          offset: DEFAULT_OFFSET_VALUE,
        },
        sort: filterRef.current.sort,
      } satisfies EmployeeSearchPayload),
    );
  };

  function hasAnyActiveFilters(
    filters: EmployeeSearchPayload["filters"],
  ): boolean {
    const {
      businessUnitId,
      teamId,
      subTeamId,
      unitId,
      careerFunctionId,
      designationId,
      gender,
      employmentTypeIds,
      managerEmail,
      companyId,
      officeId,
      employeeStatuses,
      excludeFutureStartDate,
    } = filters;

    return Boolean(
      businessUnitId ||
      teamId ||
      subTeamId ||
      unitId ||
      careerFunctionId ||
      gender ||
      designationId ||
      employmentTypeIds?.length ||
      managerEmail ||
      companyId ||
      officeId ||
      employeeStatuses?.length ||
      excludeFutureStartDate,
    );
  }

  // Count how many filters are active
  const activeFilterCount = useMemo(() => {
    const {
      businessUnitId,
      teamId,
      subTeamId,
      unitId,
      careerFunctionId,
      designationId,
      gender,
      employmentTypeIds,
      managerEmail,
      companyId,
      officeId,
      employeeStatuses,
      excludeFutureStartDate,
    } = filterPayload.filters;
    return [
      businessUnitId,
      teamId,
      subTeamId,
      unitId,
      careerFunctionId,
      designationId,
      gender,
      employmentTypeIds?.length,
      managerEmail,
      companyId,
      officeId,
      employeeStatuses?.length,
      excludeFutureStartDate,
    ].filter(Boolean).length;
  }, [filterPayload.filters]);

  // Check if any of the filters are active
  const active = activeFilterCount > 0;

  // Shared style for the multi-select filter chips (Employment Type, Status).
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

  // Derive manager emails
  const managerEmails = useMemo(() => {
    return employeeState.managers.map((manager) => manager.workEmail);
  }, [employeeState.managers]);

  /**
   * Configurations for the filter chips in the SearchForm.
   * When adding a new filter chip to the SearchForm, add its configuration to this array.
   */
  const filterChipConfigs = useMemo<ChipConfig[]>(
    () => [
      {
        kind: "businessUnit",
        label: "Business Unit",
        value: toSentenceCase(businessUnits.find(
          (bu) => bu.id === filterPayload.filters.businessUnitId,
        )?.name ?? ""),
        options: sortAndFormatOptions(businessUnits, (bu) => bu.name),
        getLabel: (businessUnit: BusinessUnit) => toSentenceCase(businessUnit.name),
        onChange: (businessUnit: BusinessUnit) =>
          updateSearchPayload({ filters: { businessUnitId: businessUnit.id } }),
        onClear: () =>
          updateSearchPayload({ filters: { businessUnitId: undefined } }),
      },
      {
        kind: "team",
        label: "Team",
        value: toSentenceCase(teams.find((team) => team.id === filterPayload.filters.teamId)?.name ?? ""),
        options: sortAndFormatOptions(teams, (t) => t.name),
        getLabel: (team: Team) => toSentenceCase(team.name),
        onChange: (team: Team) =>
          updateSearchPayload({ filters: { teamId: team.id } }),
        onClear: () => updateSearchPayload({ filters: { teamId: undefined } }),
      },
      {
        kind: "subTeam",
        label: "Sub Team",
        value: toSentenceCase(subTeams.find(
          (subTeam) => subTeam.id === filterPayload.filters.subTeamId,
        )?.name ?? ""),
        options: sortAndFormatOptions(subTeams, (st) => st.name),
        getLabel: (subTeam: SubTeam) => toSentenceCase(subTeam.name),
        onChange: (subTeam: SubTeam) =>
          updateSearchPayload({ filters: { subTeamId: subTeam.id } }),
        onClear: () =>
          updateSearchPayload({ filters: { subTeamId: undefined } }),
      },
      {
        kind: "unit",
        label: "Unit",
        value: toSentenceCase(units.find((unit) => unit.id === filterPayload.filters.unitId)?.name ?? ""),
        options: sortAndFormatOptions(units, (u) => u.name),
        getLabel: (unit: Unit) => toSentenceCase(unit.name),
        onChange: (unit: Unit) =>
          updateSearchPayload({ filters: { unitId: unit.id } }),
        onClear: () => updateSearchPayload({ filters: { unitId: undefined } }),
      },
      {
        kind: "careerFunction",
        label: "Career Function",
        value: toSentenceCase(careerFunctions.find(
          (cf) => cf.id === filterPayload.filters.careerFunctionId,
        )?.careerFunction ?? ""),
        options: sortAndFormatOptions(careerFunctions, (cf) => cf.careerFunction),
        getLabel: (careerFunction: CareerFunction) =>
          toSentenceCase(careerFunction.careerFunction),
        onChange: (careerFunction: CareerFunction) =>
          updateSearchPayload({
            filters: { careerFunctionId: careerFunction.id },
          }),
        onClear: () =>
          updateSearchPayload({ filters: { careerFunctionId: undefined } }),
      },
      {
        kind: "designation",
        label: "Designation",
        value: toSentenceCase(designations.find(
          (designation) =>
            designation.id === filterPayload.filters.designationId,
        )?.designation ?? ""),
        options: sortAndFormatOptions(designations, (d) => d.designation),
        getLabel: (designation: Designation) => toSentenceCase(designation.designation),
        onChange: (designation: Designation) => {
          updateSearchPayload({
            filters: { designationId: designation.id },
          });
        },
        onClear: () =>
          updateSearchPayload({ filters: { designationId: undefined } }),
      },
      {
        kind: "company",
        label: "Company",
        value: toSentenceCase(companies.find(
          (company) => company.id === filterPayload.filters.companyId,
        )?.name ?? ""),
        options: sortAndFormatOptions(companies, (c) => c.name),
        getLabel: (company: Company) => toSentenceCase(company.name),
        onChange: (company: Company) =>
          updateSearchPayload({ filters: { companyId: company.id } }),
        onClear: () =>
          updateSearchPayload({ filters: { companyId: undefined } }),
      },
      {
        kind: "office",
        label: "Office",
        value: toSentenceCase(offices.find(
          (office) => office.id === filterPayload.filters.officeId,
        )?.name ?? ""),
        options: sortAndFormatOptions(offices, (o) => o.name),
        getLabel: (office: Office) => toSentenceCase(office.name),
        onChange: (office: Office) => {
          updateSearchPayload({ filters: { officeId: office.id } });
        },
        onClear: () =>
          updateSearchPayload({ filters: { officeId: undefined } }),
      },
      {
        kind: "manager",
        label: "Manager",
        value: managerEmails.find(
          (email) => email === filterPayload.filters.managerEmail,
        ),
        options: sortAndFormatOptions(managerEmails, (e) => e),
        getLabel: (managerEmail: string) => managerEmail,
        onChange: (managerEmail: string) =>
          updateSearchPayload({ filters: { managerEmail } }),
        onClear: () =>
          updateSearchPayload({ filters: { managerEmail: undefined } }),
      },
      {
        kind: "gender",
        label: "Gender",
        value: toSentenceCase(filterPayload.filters.gender ?? ""),
        options: sortAndFormatOptions(EmployeeGenders, (g) => g),
        getLabel: (gender: string) => toSentenceCase(gender),
        onChange: (gender: string) =>
          updateSearchPayload({ filters: { gender } }),
        onClear: () => updateSearchPayload({ filters: { gender: undefined } }),
      },
    ],
    [
      businessUnits,
      careerFunctions,
      companies,
      designations,
      filterPayload.filters.businessUnitId,
      filterPayload.filters.careerFunctionId,
      filterPayload.filters.companyId,
      filterPayload.filters.designationId,
      filterPayload.filters.gender,
      filterPayload.filters.managerEmail,
      filterPayload.filters.officeId,
      filterPayload.filters.subTeamId,
      filterPayload.filters.teamId,
      filterPayload.filters.unitId,
      managerEmails,
      offices,
      subTeams,
      teams,
      units,
      updateSearchPayload,
    ],
  );

  const assertNever = (x: never): never => {
    throw new Error("Unhandled chip kind");
  };

  const hasActiveFilters = useMemo(() => {
    return hasAnyActiveFilters(filterPayload.filters);
  }, [filterPayload.filters]);

  const hasSearchString = !!employeeState.employeeFilter.searchString?.trim();
  const showFilteredCard =
    (employeeState.filterAppliedOnce && hasActiveFilters) || hasSearchString;

  const isLoading: boolean =
    employeeState.filteredEmployeesResponseState === State.loading;

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {/* Title + Searchbar */}
        <Grid item width="100%" sx={{ display: "flex" }}>
          <Grid
            container
            justifyContent="flex-end"
            spacing={2}
            alignItems="center"
          >
            {/* Left: title + count-pills */}
            <Grid item flex={1}>
              <Stack
                display="flex"
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ pl: 0.5 }}
              >
                <GroupsIcon
                  sx={{ fontSize: 20, color: theme.palette.text.secondary }}
                />
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{ letterSpacing: "-0.3px" }}
                >
                  Employees
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
                          color:
                            theme.palette.mode === "dark"
                              ? theme.palette.grey[100]
                              : theme.palette.grey[800],
                        }}
                      >
                        {isLoading ? (
                          <Skeleton variant="rounded" width={24} height={14} />
                        ) : (
                          (employeeState.totalActiveEmployeeCount ?? "—")
                        )}
                      </Box>
                    </>
                  }
                  sx={{
                    ml: 1,
                    height: "auto",
                    borderRadius: "100px",
                    border: `1px solid ${theme.palette.text.disabled}`,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? theme.palette.background.paper
                        : "#fff",
                    "& .MuiChip-label": {
                      padding: "6px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    },
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
                            color: alpha(
                              theme.palette.secondary.contrastText,
                              0.85,
                            ),
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
                            color:
                              theme.palette.mode === "dark"
                                ? theme.palette.grey[100]
                                : theme.palette.grey[800],
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
                      background: alpha(
                        theme.palette.secondary.contrastText,
                        0.1,
                      ),
                      "& .MuiChip-label": {
                        padding: "6px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      },
                    }}
                  />
                )}
              </Stack>
            </Grid>

            {/* Center: search input */}
            <Grid
              item
              sx={{ display: "flex", width: "40%" }}
            >
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
                  if (debounceRef.current)
                    window.clearTimeout(debounceRef.current);
                  debounceRef.current = window.setTimeout(() => {
                    updateSearchPayload({ searchString: value });
                  }, 300);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        fontSize="small"
                        sx={{ color: theme.palette.text.disabled }}
                      />
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
                          if (debounceRef.current)
                            window.clearTimeout(debounceRef.current);
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
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.secondary.contrastText,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: theme.palette.secondary.contrastText,
                    },
                  },
                }}
              />
            </Grid>
            {/* Right: filter button */}
            <Grid
              item
              sx={{
                display: "flex",
                pr: 0.5,
              }}
            >
              <Tooltip
                title={
                  active
                    ? `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active`
                    : "Open filters"
                }
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
                    size="small"
                    onClick={() => setDrawerOpen(true)}
                    startIcon={
                      <FilterAltOutlined sx={{ fontSize: "18px !important" }} />
                    }
                    sx={{
                      textTransform: "none",
                      px: 2,
                      height: 40,
                      borderRadius: "8px",
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      backgroundColor: active
                        ? alpha(theme.palette.secondary.contrastText, 0.06)
                        : "transparent",
                      "&:hover": {
                        backgroundColor: alpha(
                          theme.palette.secondary.contrastText,
                          0.1,
                        ),
                      },
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
        <Grid
          item
          width="100%"
          sx={{ display: "flex", minHeight: filtersAppliedOnce ? 32 : 0 }}
        >
          {filtersAppliedOnce && (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
              sx={{ mb: 2, width: "100%" }}
            >
              {filterChipConfigs.map((config) => {
                switch (config.kind) {
                  case "businessUnit": {
                    const { kind, ...props } = config;
                    return (
                      <FilterChipSelect<BusinessUnit> key={kind} {...props} />
                    );
                  }
                  case "team": {
                    const { kind, ...props } = config;
                    return <FilterChipSelect<Team> key={kind} {...props} />;
                  }
                  case "subTeam": {
                    const { kind, ...props } = config;
                    return <FilterChipSelect<SubTeam> key={kind} {...props} />;
                  }
                  case "unit": {
                    const { kind, ...props } = config;
                    return <FilterChipSelect<Unit> key={kind} {...props} />;
                  }
                  case "careerFunction": {
                    const { kind, ...props } = config;
                    return (
                      <FilterChipSelect<CareerFunction> key={kind} {...props} />
                    );
                  }
                  case "designation": {
                    const { kind, ...props } = config;
                    return (
                      <FilterChipSelect<Designation> key={kind} {...props} />
                    );
                  }
                  case "company": {
                    const { kind, ...props } = config;
                    return <FilterChipSelect<Company> key={kind} {...props} />;
                  }
                  case "office": {
                    const { kind, ...props } = config;
                    return <FilterChipSelect<Office> key={kind} {...props} />;
                  }
                  case "manager":
                  case "gender": {
                    const { kind, ...props } = config;
                    return <FilterChipSelect<string> key={kind} {...props} />;
                  }
                  default:
                    return assertNever(config);
                }
              })}
              {(filterPayload.filters.employmentTypeIds ?? []).map((id) => {
                const employmentType = employmentTypes.find((et) => et.id === id);
                if (!employmentType) return null;
                return (
                  <Chip
                    key={`employmentType-${id}`}
                    label={`Employment Type: ${toSentenceCase(employmentType.name)}`}
                    variant="outlined"
                    onDelete={() => {
                      const next = (filterPayload.filters.employmentTypeIds ?? []).filter(
                        (x) => x !== id,
                      );
                      updateSearchPayload({
                        filters: { employmentTypeIds: next.length ? next : undefined },
                      });
                    }}
                    sx={multiFilterChipSx}
                  />
                );
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
        setFiltersAppliedOnce={(value) => dispatch(setFilterAppliedOnce(value))}
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
        multiSelectEmploymentType
        multiSelectStatus
      />
    </Box>
  );
}
