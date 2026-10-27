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
} from "@config/constant";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Switch,
  Typography,
  useTheme,
} from "@mui/material";
import { BaseTextField } from "@root/src/component/common/FieldInput/BasicFieldInput/BaseTextField";
import { toSentenceCase, sortAndFormatOptions } from "@utils/utils";
import { EmployeeStatus } from "@/types/types";
import { EmployeeSearchPayload, Filters } from "@slices/employeeSlice/employee";
import { LeadershipGroup } from "@slices/leadershipSlice/leadership";
import {
  BusinessUnit,
  CareerFunction,
  Company,
  Designation,
  EmploymentType,
  Office,
  SubTeam,
  Team,
  Unit,
} from "@slices/organizationSlice/organization";
import { useEffect, useState } from "react";
import {
  CareerFunctionAndDesignationFilters,
  CareerFunctionsAndDesignationsSelection,
} from "./CareerFunctionAndDesignationFilters";
import {
  CompanyAndOfficeFilters,
  CompanyAndOfficeSelection,
} from "./CompanyAndOfficeFilters";
import {
  OrganizationSelection,
  OrganizationTreeFilters,
} from "./OrganizationTreeFilters";

type FilterDrawerProps = {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  setFiltersAppliedOnce: (applied: boolean) => void;
  appliedFilter: EmployeeSearchPayload;
  onApply: (next: Partial<EmployeeSearchPayload>) => void;
  clearAll: () => void;
  businessUnits: BusinessUnit[];
  teams: Team[];
  subTeams: SubTeam[];
  units: Unit[];
  careerFunctions: CareerFunction[];
  designations: Designation[];
  employmentTypes: EmploymentType[];
  managerEmails: string[];
  companies: Company[];
  offices: Office[];
  /** When true, renders a "Direct Reports Only" toggle inside the drawer (My Team view). */
  showDirectReportsFilter?: boolean;
  /** When false, hides the Employee Status autocomplete (report views where status is fixed). Default true. */
  showEmployeeStatusFilter?: boolean;
  /** When false, hides the "Exclude future joiners" toggle. Default true. */
  showExcludeFutureFilter?: boolean;
  /** When true, renders an "Include marked leavers" toggle (Active Employees report). Default false. */
  showIncludeMarkedLeaversFilter?: boolean;
  /** When true, the Employment Type filter is a multi-select bound to `employmentTypeIds`. Default false. */
  multiSelectEmploymentType?: boolean;
  /** When true, the Employee Status filter is a multi-select bound to `employeeStatuses`. Default false. */
  multiSelectStatus?: boolean;
  /** When true, the Leadership Attribute filter is shown. Default false. */
  showLeadershipGroupFilter?: boolean;
  leadershipGroups?: LeadershipGroup[];
};

export function FilterDrawer({
  drawerOpen,
  setDrawerOpen,
  setFiltersAppliedOnce,
  appliedFilter,
  onApply,
  clearAll,
  businessUnits,
  teams,
  subTeams,
  units,
  careerFunctions,
  designations,
  employmentTypes,
  managerEmails,
  companies,
  offices,
  showDirectReportsFilter = false,
  showEmployeeStatusFilter = true,
  showExcludeFutureFilter = true,
  showIncludeMarkedLeaversFilter = false,
  multiSelectEmploymentType = false,
  multiSelectStatus = false,
  showLeadershipGroupFilter = false,
  leadershipGroups = [],
}: FilterDrawerProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState<EmployeeSearchPayload>(appliedFilter);

  useEffect(() => {
    if (drawerOpen) {
      setDraft(appliedFilter);
    }
  }, [drawerOpen, appliedFilter]);

  const set = (patch: Partial<Filters>) => {
    setDraft((p) => ({ ...p, filters: { ...p.filters, ...patch } } satisfies EmployeeSearchPayload));
  };

  return (
    <Dialog
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h5" color="primary">
          Filters
        </Typography>
        <IconButton size="small" color="primary" onClick={() => setDrawerOpen(false)}>
          <ClearIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, px: 4, overflow: "hidden" }}>
        <Grid container spacing={6} alignItems="flex-start">

          {/* Column 1 — Organization */}
          <Grid item xs={12} md={4}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Organization
            </Typography>
            <OrganizationTreeFilters
              value={
                {
                  businessUnitId: draft.filters.businessUnitId,
                  teamId: draft.filters.teamId,
                  subTeamId: draft.filters.subTeamId,
                  unitId: draft.filters.unitId,
                } as OrganizationSelection
              }
              businessUnits={businessUnits}
              teams={teams}
              subTeams={subTeams}
              units={units}
              onChangeBusinessUnit={(selected: BusinessUnit | null) => {
                set({ businessUnitId: selected?.id });
              }}
              onChangeTeam={(selected: Team | null) => {
                set({ teamId: selected?.id });
              }}
              onChangeSubTeam={(selected: SubTeam | null) => {
                set({ subTeamId: selected?.id });
              }}
              onChangeUnit={(selected: Unit | null) => {
                set({ unitId: selected?.id });
              }}
            />
          </Grid>

          {/* Column 2 — Career & Location */}
          <Grid item xs={12} md={4}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Career
            </Typography>
            <CareerFunctionAndDesignationFilters
              value={
                {
                  careerFunctionId: draft.filters.careerFunctionId,
                  designationId: draft.filters.designationId,
                } as CareerFunctionsAndDesignationsSelection
              }
              careerFunctions={careerFunctions}
              designations={designations}
              onChangeCareerFunction={(selected: CareerFunction | null) => {
                set({ careerFunctionId: selected?.id });
              }}
              onChangeDesignation={(selected: Designation | null) => {
                set({ designationId: selected?.id });
              }}
            />
            <Typography variant="overline" color="text.secondary" sx={{ mt: 2, mb: 1, display: "block" }}>
              Location
            </Typography>
            <CompanyAndOfficeFilters
              value={
                {
                  companyId: draft.filters.companyId,
                  officeId: draft.filters.officeId,
                } as CompanyAndOfficeSelection
              }
              companies={companies}
              offices={offices}
              onChangeCompany={(selected: Company | null) => {
                set({ companyId: selected?.id });
              }}
              onChangeOffice={(selected: Office | null) => {
                set({ officeId: selected?.id });
              }}
            />
          </Grid>

          {/* Column 3 — Other */}
          <Grid item xs={12} md={4}>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Other
            </Typography>
            <Stack spacing={2}>
              {multiSelectEmploymentType ? (
                <Autocomplete<EmploymentType, true, false, false>
                  multiple
                  options={sortAndFormatOptions(employmentTypes, (et) => et.name)}
                  getOptionLabel={(o) => toSentenceCase(o.name)}
                  value={employmentTypes.filter((et) =>
                    (draft.filters.employmentTypeIds ?? []).includes(et.id),
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  autoHighlight
                  onChange={(_, selected) =>
                    set({
                      employmentTypeIds: selected.length
                        ? selected.map((s) => s.id)
                        : undefined,
                      employmentTypeId: undefined,
                    })
                  }
                  ListboxProps={{ style: { maxHeight: 240, overflow: "auto" } }}
                  renderInput={(params) => (
                    <BaseTextField {...params} size="small" label="Employment Type" />
                  )}
                />
              ) : (
                <Autocomplete<EmploymentType, false, false, false>
                  options={sortAndFormatOptions(employmentTypes, (et) => et.name)}
                  getOptionLabel={(o) => toSentenceCase(o.name)}
                  value={
                    employmentTypes.find(
                      (et) => et.id === draft.filters.employmentTypeId,
                    ) ?? null
                  }
                  autoHighlight
                  autoSelect
                  onChange={(_, selected) =>
                    set({
                      employmentTypeId: selected?.id || undefined,
                      employmentTypeIds: undefined,
                    })
                  }
                  ListboxProps={{ style: { maxHeight: 240, overflow: "auto" } }}
                  renderInput={(params) => (
                    <BaseTextField {...params} size="small" label="Employment Type" />
                  )}
                />
              )}
              {showLeadershipGroupFilter && (
                <Autocomplete<LeadershipGroup, true, false, false>
                  multiple
                  options={sortAndFormatOptions(leadershipGroups, (g) => g.name)}
                  getOptionLabel={(o) => o.name}
                  value={leadershipGroups.filter((g) =>
                    (draft.filters.leadershipGroupIds ?? []).includes(g.id),
                  )}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  autoHighlight
                  onChange={(_, selected) =>
                    set({
                      // Empty must be undefined, never [] — the report's active-filter
                      // badge counts keys whose value !== undefined.
                      leadershipGroupIds: selected.length
                        ? selected.map((s) => s.id)
                        : undefined,
                    })
                  }
                  ListboxProps={{ style: { maxHeight: 240, overflow: "auto" } }}
                  renderInput={(params) => (
                    <BaseTextField
                      {...params}
                      size="small"
                      label="Leadership Attribute (has all selected)"
                    />
                  )}
                />
              )}
              <Autocomplete<string, false, false, false>
                options={managerEmails}
                getOptionLabel={(email) => email}
                value={
                  managerEmails.find((e) => e === draft.filters.managerEmail) ?? null
                }
                autoHighlight
                autoSelect
                onChange={(_, selected) =>
                  set({ managerEmail: selected || undefined })
                }
                ListboxProps={{ style: { maxHeight: 240, overflow: "auto" } }}
                renderInput={(params) => (
                  <BaseTextField {...params} size="small" label="Manager Email" />
                )}
              />
              <Autocomplete<string, false, false, false>
                options={sortAndFormatOptions(EmployeeGenders, (g) => g)}
                getOptionLabel={(o) => toSentenceCase(o)}
                value={EmployeeGenders.find((g) => g === draft.filters.gender) ?? null}
                autoHighlight
                autoSelect
                onChange={(_, selected) =>
                  set({ gender: selected || undefined })
                }
                renderInput={(params) => (
                  <BaseTextField {...params} size="small" label="Gender" />
                )}
              />
              {showEmployeeStatusFilter &&
                (multiSelectStatus ? (
                  <Autocomplete<EmployeeStatus, true, false, false>
                    multiple
                    options={sortAndFormatOptions(Object.values(EmployeeStatus), (s) => s)}
                    getOptionLabel={(o) => toSentenceCase(o)}
                    value={draft.filters.employeeStatuses ?? []}
                    isOptionEqualToValue={(opt, val) => opt === val}
                    autoHighlight
                    onChange={(_, selected) =>
                      set({
                        employeeStatuses: selected.length ? selected : undefined,
                        employeeStatus: undefined,
                        includeMarkedLeavers: undefined,
                      })
                    }
                    renderInput={(params) => (
                      <BaseTextField {...params} size="small" label="Employee Status" />
                    )}
                  />
                ) : (
                  <Autocomplete<EmployeeStatus, false, false, false>
                    options={sortAndFormatOptions(Object.values(EmployeeStatus), (s) => s)}
                    getOptionLabel={(o) => toSentenceCase(o)}
                    value={Object.values(EmployeeStatus).find((es) => es === draft.filters.employeeStatus) ?? null}
                    autoHighlight
                    autoSelect
                    onChange={(_, selected) =>
                      set({
                        employeeStatus: selected || undefined,
                        employeeStatuses: undefined,
                      })
                    }
                    renderInput={(params) => (
                      <BaseTextField {...params} size="small" label="Employee Status" />
                    )}
                  />
                ))}
              {showDirectReportsFilter && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.filters.directReports === true}
                      onChange={(e) => set({ directReports: e.target.checked })}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.secondary.contrastText },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.secondary.contrastText, opacity: 0.7 },
                      }}
                    />
                  }
                  label="Direct Reports Only"
                />
              )}
              {showExcludeFutureFilter && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.filters.excludeFutureStartDate === true}
                      onChange={(e) => set({ excludeFutureStartDate: e.target.checked ? true : undefined })}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.secondary.contrastText },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.secondary.contrastText, opacity: 0.7 },
                      }}
                    />
                  }
                  label="Exclude future joiners"
                />
              )}
              {showIncludeMarkedLeaversFilter && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.filters.includeMarkedLeavers !== false}
                      onChange={(e) => set({ includeMarkedLeavers: e.target.checked })}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.secondary.contrastText },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.secondary.contrastText, opacity: 0.7 },
                      }}
                    />
                  }
                  label="Include marked leavers"
                />
              )}
            </Stack>
          </Grid>

        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          variant="text"
          color="inherit"
          sx={{ textTransform: "none" }}
          onClick={() => setDrawerOpen(false)}
        >
          Close
        </Button>
        <Button
          variant="outlined"
          color="primary"
          sx={{ textTransform: "none" }}
          onClick={clearAll}
        >
          Clear all
        </Button>
        <Button
          variant="contained"
          color="secondary"
          sx={{ textTransform: "none" }}
          onClick={() => {
            const nextDraft = {
              ...draft,
              filters: { ...draft.filters },
              pagination: {
                limit: DEFAULT_LIMIT_VALUE,
                offset: DEFAULT_OFFSET_VALUE,
              },
            };
            onApply(nextDraft);
            setDraft(nextDraft);
            setDrawerOpen(false);
            setFiltersAppliedOnce(true);
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
