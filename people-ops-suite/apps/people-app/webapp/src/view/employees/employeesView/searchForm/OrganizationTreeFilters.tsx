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

import { Autocomplete, Box, Grid, Typography } from "@mui/material";
import { BaseTextField } from "@root/src/component/common/FieldInput/BasicFieldInput/BaseTextField";
import {
  BusinessUnit,
  SubTeam,
  Team,
  Unit,
} from "@root/src/slices/organizationSlice/organization";
import { toSentenceCase, sortAndFormatOptions } from "@utils/utils";

export type OrganizationSelection = {
  businessUnitId?: number;
  teamId?: number;
  subTeamId?: number;
  unitId?: number;
};

export type OrganizationTreeFiltersProps = {
  value: OrganizationSelection;

  businessUnits: BusinessUnit[];
  teams: Team[];
  subTeams: SubTeam[];
  units: Unit[];

  onChangeBusinessUnit: (selected: BusinessUnit | null) => void;
  onChangeTeam: (selected: Team | null) => void;
  onChangeSubTeam: (selected: SubTeam | null) => void;
  onChangeUnit: (selected: Unit | null) => void;
};

export function OrganizationTreeFilters({
  value,
  businessUnits,
  teams,
  subTeams,
  units,
  onChangeBusinessUnit,
  onChangeTeam,
  onChangeSubTeam,
  onChangeUnit,
}: OrganizationTreeFiltersProps) {
  const treeItemSx = {
    position: "relative",
    pl: 2,
    pt: 1,
    // horizontal connector
    "&::before": {
      content: '""',
      position: "absolute",
      top: "38px",
      left: "8px",
      width: "8px",
      height: "1px",
      bgcolor: "text.disabled",
    },
    // vertical connector
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "8px",
      width: "1px",
      bottom: 0,
      bgcolor: "text.disabled",
    },
    // stop vertical line at the horizontal connector for the last child
    "&:last-child::after": {
      bottom: "auto",
      height: "38px",
    },
  };

  return (
    <Box
      sx={{
        width: "100%",

      }}
    >
      <Grid container direction="column">
        <Typography variant="h5" color="primary">
          Organization
        </Typography>
      </Grid>

      <Box sx={{ pl: 0.5 }}>
        <Box sx={treeItemSx}>
          <Autocomplete<BusinessUnit, false, false, false>
            options={sortAndFormatOptions(businessUnits, (b) => b.name)}
            getOptionLabel={(o) => toSentenceCase(o.name)}
            value={
              businessUnits.find((b) => b.id === value.businessUnitId) ?? null
            }
            onChange={(_, selected) => onChangeBusinessUnit(selected)}
            renderInput={(params) => (
              <BaseTextField
                {...params}
                size="small"
                label="Business Unit"
                sx={{ mt: 1 }}
              />
            )}
          />

          <Box>
            <Box sx={treeItemSx}>
              <Autocomplete<Team, false, false, false>
                options={sortAndFormatOptions(teams, (t) => t.name)}
                getOptionLabel={(o) => toSentenceCase(o.name)}
                value={teams.find((t) => t.id === value.teamId) ?? null}
                onChange={(_, selected) => onChangeTeam(selected)}
                renderInput={(params) => (
                  <BaseTextField
                    {...params}
                    size="small"
                    label="Team"
                    sx={{ mt: 1 }}
                  />
                )}
              />

              <Box>
                <Box sx={treeItemSx}>
                  <Autocomplete<SubTeam, false, false, false>
                    options={sortAndFormatOptions(subTeams, (st) => st.name)}
                    getOptionLabel={(o) => toSentenceCase(o.name)}
                    value={
                      subTeams.find((st) => st.id === value.subTeamId) ?? null
                    }
                    onChange={(_, selected) => onChangeSubTeam(selected)}
                    renderInput={(params) => (
                      <BaseTextField
                        {...params}
                        size="small"
                        label="Sub Team"
                        sx={{ mt: 1 }}
                      />
                    )}
                  />

                  <Box>
                    <Box sx={treeItemSx}>
                      <Autocomplete<Unit, false, false, false>
                        options={sortAndFormatOptions(units, (u) => u.name)}
                        getOptionLabel={(o) => toSentenceCase(o.name)}
                        value={units.find((u) => u.id === value.unitId) ?? null}
                        onChange={(_, selected) => onChangeUnit(selected)}
                        renderInput={(params) => (
                          <BaseTextField
                            {...params}
                            size="small"
                            label="Unit"
                            sx={{ mt: 1 }}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
