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

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { APIService } from "@utils/apiService";
import { State } from "@/types/types";
import { AppConfig } from "@config/config";
import { isCancel, isAxiosError } from "axios";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { RootState } from "@slices/store";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompanyOrgChartEntity {
  id: number;
  name: string;
  headEmail: string;
  isActive: boolean;
  activeEmployeeCount: number;
}

export interface CreateEntityPayload {
  name: string;
  headEmail: string;
}

export interface UpdateEntityPayload {
  name?: string | null;
  headEmail?: string | null;
  isActive?: boolean | null;
}

export interface CreateBusinessUnitTeamPayload {
  businessUnitId: number;
  teamId: number;
  headEmail: string;
}

export interface CreateBusinessUnitTeamSubTeamPayload {
  businessUnitTeamId: number;
  subTeamId: number;
  headEmail: string;
}

export interface CreateBusinessUnitTeamSubTeamUnitPayload {
  businessUnitTeamSubTeamId: number;
  unitId: number;
  headEmail: string;
}

export interface UpdateMappingPayload {
  headEmail?: string | null;
  isActive?: boolean | null;
}

export interface CompanyOrgChartUnit {
  id: number;
  name: string;
  headEmail: string;
  isActive: boolean;
  mappingId: number;
  mappingHeadEmail: string;
  mappingIsActive: boolean;
}

export interface CompanyOrgChartSubTeam {
  id: number;
  name: string;
  headEmail: string;
  isActive: boolean;
  mappingId: number;
  mappingHeadEmail: string;
  mappingIsActive: boolean;
  units: CompanyOrgChartUnit[];
}

export interface CompanyOrgChartTeam {
  id: number;
  name: string;
  headEmail: string;
  isActive: boolean;
  mappingId: number;
  mappingHeadEmail: string;
  mappingIsActive: boolean;
  subTeams: CompanyOrgChartSubTeam[];
}

export interface CompanyOrgChartBusinessUnit {
  id: number;
  name: string;
  headEmail: string;
  isActive: boolean;
  teams: CompanyOrgChartTeam[];
}

// ─── State ───────────────────────────────────────────────────────────────────

export interface MasterDataState {
  businessUnits: CompanyOrgChartEntity[];
  teams: CompanyOrgChartEntity[];
  subTeams: CompanyOrgChartEntity[];
  units: CompanyOrgChartEntity[];
  orgStructure: CompanyOrgChartBusinessUnit[];
  entitiesState: State;
  orgStructureState: State;
  errorMessage: string | null;
}

const initialState: MasterDataState = {
  businessUnits: [],
  teams: [],
  subTeams: [],
  units: [],
  orgStructure: [],
  entitiesState: State.idle,
  orgStructureState: State.idle,
  errorMessage: null,
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchAllCompanyOrgChartEntities = createAsyncThunk(
  "masterData/fetchAllCompanyOrgChartEntities",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const [buResp, teamResp, subTeamResp, unitResp] = await Promise.all([
        APIService.getInstance().get(AppConfig.serviceUrls.businessUnits + "?includeInactive=true"),
        APIService.getInstance().get(AppConfig.serviceUrls.teams + "?includeInactive=true"),
        APIService.getInstance().get(AppConfig.serviceUrls.subTeams + "?includeInactive=true"),
        APIService.getInstance().get(AppConfig.serviceUrls.units + "?includeInactive=true"),
      ]);
      return {
        businessUnits: buResp.data as CompanyOrgChartEntity[],
        teams: teamResp.data as CompanyOrgChartEntity[],
        subTeams: subTeamResp.data as CompanyOrgChartEntity[],
        units: unitResp.data as CompanyOrgChartEntity[],
      };
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error fetching company org chart data";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const fetchCompanyOrgChartStructure = createAsyncThunk(
  "masterData/fetchCompanyOrgChartStructure",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().get(
        AppConfig.serviceUrls.companyOrgChartStructure,
      );
      return resp.data as CompanyOrgChartBusinessUnit[];
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error fetching organization structure";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createBusinessUnit = createAsyncThunk(
  "masterData/createBusinessUnit",
  async (payload: CreateEntityPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.businessUnits,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Business unit created", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating business unit";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateBusinessUnit = createAsyncThunk(
  "masterData/updateBusinessUnit",
  async (
    { id, payload }: { id: number; payload: UpdateEntityPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.businessUnit(id),
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Business unit updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating business unit";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createTeam = createAsyncThunk(
  "masterData/createTeam",
  async (payload: CreateEntityPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.teams,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Team created", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating team";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateTeam = createAsyncThunk(
  "masterData/updateTeam",
  async (
    { id, payload }: { id: number; payload: UpdateEntityPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(AppConfig.serviceUrls.team(id), payload);
      dispatch(enqueueSnackbarMessage({ message: "Team updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating team";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createSubTeam = createAsyncThunk(
  "masterData/createSubTeam",
  async (payload: CreateEntityPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.subTeams,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Sub-team created", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating sub-team";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateSubTeam = createAsyncThunk(
  "masterData/updateSubTeam",
  async (
    { id, payload }: { id: number; payload: UpdateEntityPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(AppConfig.serviceUrls.subTeam(id), payload);
      dispatch(enqueueSnackbarMessage({ message: "Sub-team updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating sub-team";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createUnit = createAsyncThunk(
  "masterData/createUnit",
  async (payload: CreateEntityPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.units,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Unit created", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating unit";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateUnit = createAsyncThunk(
  "masterData/updateUnit",
  async (
    { id, payload }: { id: number; payload: UpdateEntityPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(AppConfig.serviceUrls.unit(id), payload);
      dispatch(enqueueSnackbarMessage({ message: "Unit updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating unit";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createBusinessUnitTeamMapping = createAsyncThunk(
  "masterData/createBusinessUnitTeamMapping",
  async (payload: CreateBusinessUnitTeamPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.businessUnitTeams,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Team assigned to business unit", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating mapping";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateBusinessUnitTeamMapping = createAsyncThunk(
  "masterData/updateBusinessUnitTeamMapping",
  async (
    { id, payload }: { id: number; payload: UpdateMappingPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.businessUnitTeam(id),
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Mapping updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating mapping";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createBusinessUnitTeamSubTeamMapping = createAsyncThunk(
  "masterData/createBusinessUnitTeamSubTeamMapping",
  async (payload: CreateBusinessUnitTeamSubTeamPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.businessUnitTeamSubTeams,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Sub-team assigned to team", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating mapping";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateBusinessUnitTeamSubTeamMapping = createAsyncThunk(
  "masterData/updateBusinessUnitTeamSubTeamMapping",
  async (
    { id, payload }: { id: number; payload: UpdateMappingPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.businessUnitTeamSubTeam(id),
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Mapping updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating mapping";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createBusinessUnitTeamSubTeamUnitMapping = createAsyncThunk(
  "masterData/createBusinessUnitTeamSubTeamUnitMapping",
  async (payload: CreateBusinessUnitTeamSubTeamUnitPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.businessUnitTeamSubTeamUnits,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Unit assigned to sub-team", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating mapping";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateBusinessUnitTeamSubTeamUnitMapping = createAsyncThunk(
  "masterData/updateBusinessUnitTeamSubTeamUnitMapping",
  async (
    { id, payload }: { id: number; payload: UpdateMappingPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.businessUnitTeamSubTeamUnit(id),
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Mapping updated", type: "success" }));
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating mapping";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const masterDataSlice = createSlice({
  name: "masterData",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchAllCompanyOrgChartEntities
      .addCase(fetchAllCompanyOrgChartEntities.pending, (state) => {
        state.entitiesState = State.loading;
        state.errorMessage = null;
      })
      .addCase(fetchAllCompanyOrgChartEntities.fulfilled, (state, action) => {
        state.entitiesState = State.success;
        state.businessUnits = action.payload.businessUnits;
        state.teams = action.payload.teams;
        state.subTeams = action.payload.subTeams;
        state.units = action.payload.units;
      })
      .addCase(fetchAllCompanyOrgChartEntities.rejected, (state, action) => {
        if (action.payload !== "cancelled") {
          state.entitiesState = State.failed;
          state.errorMessage = action.payload as string;
        }
      })
      // fetchCompanyOrgChartStructure
      .addCase(fetchCompanyOrgChartStructure.pending, (state) => {
        state.orgStructureState = State.loading;
        state.errorMessage = null;
      })
      .addCase(fetchCompanyOrgChartStructure.fulfilled, (state, action) => {
        state.orgStructureState = State.success;
        state.orgStructure = action.payload;
      })
      .addCase(fetchCompanyOrgChartStructure.rejected, (state, action) => {
        if (action.payload !== "cancelled") {
          state.orgStructureState = State.failed;
          state.errorMessage = action.payload as string;
        }
      });
  },
});

export default masterDataSlice.reducer;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectEntitiesState = (state: RootState) => state.masterData.entitiesState;
export const selectOrgStructureState = (state: RootState) => state.masterData.orgStructureState;
export const selectBusinessUnits = (state: RootState) => state.masterData.businessUnits;
export const selectTeams = (state: RootState) => state.masterData.teams;
export const selectSubTeams = (state: RootState) => state.masterData.subTeams;
export const selectUnits = (state: RootState) => state.masterData.units;
export const selectOrgStructure = (state: RootState) => state.masterData.orgStructure;
