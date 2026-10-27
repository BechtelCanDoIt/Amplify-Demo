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

import { State } from "@/types/types";
import { AppConfig } from "@config/config";
import { HttpStatusCode, isCancel } from "axios";
import { APIService } from "@utils/apiService";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";

// One field-level change as returned to the client.
//
// `actionBy` is optional (not `T | null`) because the reduced projection strips it
// server-side for non-privileged callers: the field is omitted from the payload
// entirely rather than sent as null.
export interface HistoryEvent {
  employeePkId: number;
  field: string;
  // Which audit table the change came from, used to group events into filter
  // categories without inferring the category from the field name.
  sourceTable: string;
  previousValue: string | null;
  currentValue: string | null;
  occurredOn: string;
  actionBy?: string;
  isSystem: boolean;
}

export interface PromotionRecord {
  // Nullable: HRIS holds APPROVED promotions in ended cycles whose promoted
  // date was never populated, so this cannot be relied on for ordering.
  promotedDate: string | null;
  // Date the request was raised. Always present, and always inside the
  // employment period it belongs to — this is what orders promotions on the
  // timeline and attributes them to an employment.
  createdOn: string;
  currentJobBand: string;
  nextJobBand: string;
  // Nullable in HRIS, so nullable here: only businessUnit, the job bands, the
  // promotion type and the cycle name are guaranteed by that schema.
  jobRole: string | null;
  promotionType: string;
  cycleName: string;
  businessUnit: string;
  department: string | null;
  team: string | null;
  subTeam: string | null;
}

export interface EmploymentPeriod {
  id: number;
  employeeId: string | null;
  employmentType: string;
  startDate: string;
  endDate: string | null;
  workEmail: string;
  continuousServiceRecord: string | null;
  promotions: PromotionRecord[];
}

export interface EmployeeHistoryResponse {
  periods: EmploymentPeriod[];
  events: HistoryEvent[];
  promotionsUnavailable: boolean;
}

interface EmployeeHistoryState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  history: EmployeeHistoryResponse | null;
}

const employeeHistoryInitialState: EmployeeHistoryState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  history: null,
};

export const fetchEmployeeHistory = createAsyncThunk(
  "employees/fetchEmployeeHistory",
  async (employeeId: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await APIService.getInstance().get(
        AppConfig.serviceUrls.employeeHistory(employeeId),
      );
      return response.data as EmployeeHistoryResponse;
    } catch (error: any) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage =
        error.response?.status === HttpStatusCode.InternalServerError
          ? "Error while fetching employee history"
          : error.response?.data?.message ||
            "An unknown error occurred while fetching employee history.";

      dispatch(
        enqueueSnackbarMessage({
          message: errorMessage,
          type: "error",
        }),
      );

      return rejectWithValue(errorMessage);
    }
  },
);

const EmployeeHistorySlice = createSlice({
  name: "employeeHistory",
  initialState: employeeHistoryInitialState,
  reducers: {
    resetEmployeeHistory(state) {
      state.state = State.idle;
      state.stateMessage = null;
      state.errorMessage = null;
      state.history = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeeHistory.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching employee history...";
        // Cleared here rather than on unmount: the slice is global, so without
        // this a fetch for a second employee renders the first one's timeline
        // until it resolves — stale data presented as current. Clearing in
        // `pending` covers every entry point, not just the component's cleanup.
        state.history = null;
        state.errorMessage = null;
      })
      .addCase(fetchEmployeeHistory.fulfilled, (state, action) => {
        state.state = State.success;
        state.stateMessage = "Successfully fetched employee history!";
        state.history = action.payload;
        state.errorMessage = null;
      })
      .addCase(fetchEmployeeHistory.rejected, (state, action) => {
        state.state = State.failed;
        state.stateMessage = "Failed to fetch employee history!";
        state.errorMessage = action.payload as string;
        state.history = null;
      });
  },
});

export const { resetEmployeeHistory } = EmployeeHistorySlice.actions;
export default EmployeeHistorySlice.reducer;
