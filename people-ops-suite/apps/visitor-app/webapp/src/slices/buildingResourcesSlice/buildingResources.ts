// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { APIService } from "@utils/apiService";
import { AppConfig } from "@config/config";

interface BuildingResourcesState {
  buildingResources: BuildingResource[];
  loading: boolean;
  error: string | undefined | null;
  errorMessage: string | undefined | null;
}

export interface BuildingResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceEmail: string;
  resourceCategory: string;
  floorName?: string;
  buildingId?: string;
  description?: string;
}

const initialState: BuildingResourcesState = {
  buildingResources: [],
  loading: false,
  error: null,
  errorMessage: null,
};

export const fetchBuildingResources = createAsyncThunk(
  "buildingResources/fetch",
  async () => {
    const response = await APIService.getInstance().get(
      AppConfig.serviceUrls.buildingResources,
    );
    return response.data as BuildingResource[];
  },
);

export const buildingResourcesSlice = createSlice({
  name: "buildingResources",
  initialState,
  reducers: {
    setBuildingResources: (state, action) => {
      state.buildingResources = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBuildingResources.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorMessage = null;
      })
      .addCase(fetchBuildingResources.fulfilled, (state, action) => {
        state.loading = false;
        state.buildingResources = action.payload;
      })
      .addCase(fetchBuildingResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.name;
        state.errorMessage = action.error.message;
      });
  },
});

export const { setBuildingResources } = buildingResourcesSlice.actions;
export default buildingResourcesSlice.reducer;
