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

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { isAxiosError, isCancel } from "axios";
import { APIService } from "@utils/apiService";
import { AppConfig } from "@config/config";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { State } from "@/types/types";
import { RootState } from "@slices/store";

export interface CareerFunction {
  id: number;
  careerFunction: string;
  isActive: boolean;
  activeEmployeeCount: number;
}

export interface Designation {
  id: number;
  designation: string;
  jobBand: number | null;
  careerFunctionId: number | null;
  isActive: boolean;
  activeEmployeeCount: number;
}

export interface CreateCareerFunctionPayload {
  careerFunction: string;
}

export interface UpdateCareerFunctionPayload {
  careerFunction?: string;
  isActive?: boolean;
}

export interface CreateDesignationPayload {
  designation: string;
  jobBand: number | null;
  // Required: every new designation must belong to a career function. Existing rows may
  // still have a null career function (see the "Unassigned" group in the career function
  // view), but new ones can no longer be created that way.
  careerFunctionId: number;
}

// Sentinel used for `jobBand`, since the backend distinguishes three states for this field:
//   - field absent / null      -> leave the column unchanged
//   - field === JOB_BAND_CLEAR_SENTINEL (-1) -> clear the column to NULL
//   - field === any other int  -> set the column to that value
export const JOB_BAND_CLEAR_SENTINEL = -1;

// Sentinel used for `careerFunctionId`, mirroring the same three-state contract:
//   - field absent / null      -> leave the column unchanged
//   - field === CAREER_FUNCTION_CLEAR_SENTINEL (-1) -> clear the column to NULL
//   - field === any other int  -> set the column to that value
export const CAREER_FUNCTION_CLEAR_SENTINEL = -1;

// Sentinels used for employee job-info updates.
// The backend distinguishes an omitted field from an explicit clear:
//   - field absent -> leave the column unchanged
//   - field === *_CLEAR_SENTINEL (-1) -> clear the column to NULL
//   - any other valid ID -> set the column to that value
export const OFFICE_CLEAR_SENTINEL = -1;
export const UNIT_CLEAR_SENTINEL = -1;

// NOTE: `jobBand` and `careerFunctionId` follow a three-state sentinel contract on the backend:
//   - absent / null -> leave the existing value unchanged
//   - JOB_BAND_CLEAR_SENTINEL / CAREER_FUNCTION_CLEAR_SENTINEL (-1) -> clear the column to NULL
//   - any other number -> set the column to that value
// Do NOT transform -1 to null (or strip it) before sending this payload — the sentinel must
// reach the backend intact.
export interface UpdateDesignationPayload {
  designation?: string;
  jobBand?: number | null;
  careerFunctionId?: number | null;
  isActive?: boolean;
}

interface CareerFunctionState {
  careerFunctions: CareerFunction[];
  designations: Designation[];
  // Tracked separately: the page fetches both lists concurrently, and a single shared
  // field would flip to `success` as soon as the faster one resolved — letting consumers
  // render against a list that is still in flight. Mirrors masterDataSlice, which splits
  // entitiesState and orgStructureState for the same reason.
  careerFunctionsState: State;
  designationsState: State;
  stateMessage: string | null;
}

const initialState: CareerFunctionState = {
  careerFunctions: [],
  designations: [],
  careerFunctionsState: State.idle,
  designationsState: State.idle,
  stateMessage: null,
};

export const fetchCareerFunctions = createAsyncThunk(
  "careerFunction/fetchCareerFunctions",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().get(
        `${AppConfig.serviceUrls.careerFunctions}?includeInactive=true`,
      );
      if (!Array.isArray(resp.data)) {
        throw new Error("Invalid response: career functions should be an array");
      }
      return resp.data as CareerFunction[];
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error fetching career functions";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const fetchDesignations = createAsyncThunk(
  "careerFunction/fetchDesignations",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().get(
        `${AppConfig.serviceUrls.designations}?includeInactive=true`,
      );
      if (!Array.isArray(resp.data)) {
        throw new Error("Invalid response: designations should be an array");
      }
      return resp.data as Designation[];
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error fetching designations";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createCareerFunction = createAsyncThunk(
  "careerFunction/createCareerFunction",
  async (payload: CreateCareerFunctionPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.careerFunctions,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Career function created", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating career function";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateCareerFunction = createAsyncThunk(
  "careerFunction/updateCareerFunction",
  async (
    { id, payload }: { id: number; payload: UpdateCareerFunctionPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.careerFunction(id),
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Career function updated", type: "success" }));
      return id;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating career function";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createDesignation = createAsyncThunk(
  "careerFunction/createDesignation",
  async (payload: CreateDesignationPayload, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.designations,
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Designation created", type: "success" }));
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating designation";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateDesignation = createAsyncThunk(
  "careerFunction/updateDesignation",
  async (
    { id, payload }: { id: number; payload: UpdateDesignationPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.designation(id),
        payload,
      );
      dispatch(enqueueSnackbarMessage({ message: "Designation updated", type: "success" }));
      return id;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating designation";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

const careerFunctionSlice = createSlice({
  name: "careerFunction",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCareerFunctions.pending, (state) => {
        state.careerFunctionsState = State.loading;
        state.stateMessage = "Fetching career functions...";
      })
      .addCase(fetchCareerFunctions.fulfilled, (state, action) => {
        state.careerFunctionsState = State.success;
        state.stateMessage = null;
        state.careerFunctions = action.payload;
      })
      .addCase(fetchCareerFunctions.rejected, (state) => {
        state.careerFunctionsState = State.failed;
        state.stateMessage = "Failed to fetch career functions";
      })
      .addCase(fetchDesignations.pending, (state) => {
        state.designationsState = State.loading;
        state.stateMessage = "Fetching designations...";
      })
      .addCase(fetchDesignations.fulfilled, (state, action) => {
        state.designationsState = State.success;
        state.stateMessage = null;
        state.designations = action.payload;
      })
      .addCase(fetchDesignations.rejected, (state) => {
        state.designationsState = State.failed;
        state.stateMessage = "Failed to fetch designations";
      });
  },
});

export const selectCareerFunctions = (state: RootState) => state.careerFunction.careerFunctions;
export const selectDesignations = (state: RootState) => state.careerFunction.designations;
export const selectCareerFunctionsState = (state: RootState) =>
  state.careerFunction.careerFunctionsState;
export const selectDesignationsState = (state: RootState) =>
  state.careerFunction.designationsState;

export default careerFunctionSlice.reducer;
