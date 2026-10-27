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
  Company,
  Office
} from "@root/src/slices/organizationSlice/organization";
import { toSentenceCase, sortAndFormatOptions } from "@utils/utils";

export type CompanyAndOfficeSelection = {
  companyId?: number;
  officeId?: number;
};

export type CompanyAndOfficeFiltersProps = {
  value: CompanyAndOfficeSelection;
  offices: Office[];
  companies: Company[];

  onChangeOffice: (selected: Office | null) => void;
  onChangeCompany: (selected: Company | null) => void;
};

export function CompanyAndOfficeFilters({
  value,
  offices,
  companies,
  onChangeOffice,
  onChangeCompany,
}: CompanyAndOfficeFiltersProps) {
  const treeItemSx = {
    position: "relative",
    pl: 2,
    pt: 1,
    "&::before": {
      content: '""',
      position: "absolute",
      top: "38px",
      left: "8px",
      width: "8px",
      height: "1px",
      bgcolor: "text.disabled",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: "8px",
      width: "1px",
      bottom: 0,
      bgcolor: "text.disabled",
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
          Company and Offices
        </Typography>
      </Grid>

      <Box sx={{ pl: 0.5 }}>
        <Box sx={treeItemSx}>
          <Autocomplete<Company, false, false, false>
            options={sortAndFormatOptions(companies, (c) => c.name)}
            getOptionLabel={(company: Company) => toSentenceCase(company.name)}
            value={
              companies.find((company: Company) => company.id === value.companyId) ?? null
            }
            onChange={(_, selected) => onChangeCompany(selected)}
            renderInput={(params) => (
              <BaseTextField
                {...params}
                size="small"
                label="Company"
                sx={{ mt: 1 }}
              />
            )}
          />

          <Box>
            <Box sx={treeItemSx}>
              <Autocomplete<Office, false, false, false>
                options={sortAndFormatOptions(offices, (o) => o.name)}
                getOptionLabel={(office: Office) => toSentenceCase(office.name)}
                value={offices.find((office: Office) => office.id === value.officeId) ?? null}
                onChange={(_, selected) => onChangeOffice(selected)}
                renderInput={(params) => (
                  <BaseTextField
                    {...params}
                    size="small"
                    label="Office"
                    sx={{ mt: 1 }}
                  />
                )}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
