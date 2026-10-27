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
  CareerFunction,
  Designation
} from "@root/src/slices/organizationSlice/organization";
import { toSentenceCase, sortAndFormatOptions } from "@utils/utils";

export type CareerFunctionsAndDesignationsSelection = {
  careerFunctionId?: number;
  designationId?: number;
};

export type CareerFunctionAndDesignationFiltersProps = {
  value: CareerFunctionsAndDesignationsSelection;
  careerFunctions: CareerFunction[];
  designations: Designation[];

  onChangeCareerFunction: (selected: CareerFunction | null) => void;
  onChangeDesignation: (selected: Designation | null) => void;
};

export function CareerFunctionAndDesignationFilters({
  value,
  careerFunctions,
  designations,
  onChangeCareerFunction,
  onChangeDesignation
}: CareerFunctionAndDesignationFiltersProps) {
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
        height: "100%",
      }}
    >
      <Grid container direction="column">
        <Typography variant="h5" color="primary">
          Career Functions and Designations
        </Typography>
      </Grid>

      <Box sx={{ pl: 0.5 }}>
        <Box sx={treeItemSx}>
          <Autocomplete<CareerFunction, false, false, false>
            options={sortAndFormatOptions(careerFunctions, (c) => c.careerFunction)}
            getOptionLabel={(o) => toSentenceCase(o.careerFunction)}
            value={
              careerFunctions.find((c) => c.id === value.careerFunctionId) ?? null
            }
            onChange={(_, selected) => onChangeCareerFunction(selected)}
            renderInput={(params) => (
              <BaseTextField
                {...params}
                size="small"
                label="Career Function"
                sx={{ mt: 1 }}
              />
            )}
          />

          <Box>
            <Box sx={treeItemSx}>
              <Autocomplete<Designation, false, false, false>
                options={sortAndFormatOptions(designations, (d) => d.designation)}
                getOptionLabel={(o) => toSentenceCase(o.designation)}
                value={designations.find((d) => d.id === value.designationId) ?? null}
                onChange={(_, selected) => onChangeDesignation(selected)}
                renderInput={(params) => (
                  <BaseTextField
                    {...params}
                    size="small"
                    label="Designation"
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
