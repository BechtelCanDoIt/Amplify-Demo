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

import { State } from "@/types/types";
import { AppConfig } from "@config/config";
import { HttpStatusCode, isCancel } from "axios";
import { APIService } from "@utils/apiService";
import { SnackMessage } from "@config/constant";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { EmergencyContact } from "@/types/types";

export interface EmployeePersonalInfo {
  id: number;
  nicOrPassport: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  dob: string;
  gender: string;
  personalEmail: string | null;
  personalPhone: string | null;
  residentNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateOrProvince: string | null;
  postalCode: string | null;
  country: string | null;
  nationality: string;
  emergencyContacts: EmergencyContact[] | null;
}

export interface EmployeePersonalInfoUpdate {
  nicOrPassport?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  title?: string | null;
  dob?: string | null;
  gender?: string | null;
  personalEmail?: string | null;
  personalPhone?: string | null;
  residentNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateOrProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  nationality?: string | null;
  emergencyContacts?: EmergencyContact[] | null;
}

interface EmployeePersonalInfoState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  personalInfo: EmployeePersonalInfo | null;
}

const employeePersonalInfoInitialState: EmployeePersonalInfoState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  personalInfo: null,
};

export const fetchEmployeePersonalInfo = createAsyncThunk(
  "employees/fetchEmployeePersonalInfo",
  async (employeeId: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await APIService.getInstance().get(
        AppConfig.serviceUrls.employeePersonalInfo(employeeId),
      );
      return response.data as EmployeePersonalInfo;
    } catch (error: any) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage =
        error.response?.status === HttpStatusCode.InternalServerError
          ? SnackMessage.error.fetchEmployee
          : error.response?.data?.message ||
            "An unknown error occurred while fetching employee personal information.";

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

export const updateEmployeePersonalInfo = createAsyncThunk<
  void,
  { employeeId: string; data: EmployeePersonalInfoUpdate },
  { rejectValue: string }
>(
  "employees/updateEmployeePersonalInfo",
  async ({ employeeId, data }, { dispatch, rejectWithValue }) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.employeePersonalInfo(employeeId),
        data,
      );

      dispatch(
        enqueueSnackbarMessage({
          message: "Successfully updated!",
          type: "success",
        }),
      );
      return;
    } catch (error: any) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage =
        error?.response?.status === HttpStatusCode.InternalServerError
          ? SnackMessage.error.updateEmployeePersonalInfo
          : error?.response?.data?.message ||
            "An unknown error occurred while updating employee personal information.";

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

const EmployeePersonalInfoSlice = createSlice({
  name: "employeePersonalInfo",
  initialState: employeePersonalInfoInitialState,
  reducers: {
    resetSubmitState(state) {
      state.state = State.idle;
    },
    resetPersonalInfo(state) {
      state.state = State.idle;
      state.stateMessage = null;
      state.errorMessage = null;
      state.personalInfo = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployeePersonalInfo.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Fetching employee personal info...";
      })
      .addCase(fetchEmployeePersonalInfo.fulfilled, (state, action) => {
        state.state = State.success;
        state.stateMessage =
          "Successfully fetched employee personal information!";
        state.personalInfo = action.payload;
        state.errorMessage = null;
      })
      .addCase(fetchEmployeePersonalInfo.rejected, (state, action) => {
        state.state = State.failed;
        state.stateMessage = "Failed to fetch employee personal information!";
        state.errorMessage = action.payload as string;
        state.personalInfo = null;
      })
      .addCase(updateEmployeePersonalInfo.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Updating employee personal info...";
      })
      .addCase(updateEmployeePersonalInfo.fulfilled, (state, action) => {
        state.state = State.success;
        state.stateMessage =
          "Successfully updated employee personal information!";
        state.errorMessage = null;
      })
      .addCase(updateEmployeePersonalInfo.rejected, (state, action) => {
        state.state = State.failed;
        state.stateMessage = "Failed to update employee personal information!";
        state.errorMessage = action.payload as string;
      });
  },
});

export const { resetSubmitState, resetPersonalInfo } =
  EmployeePersonalInfoSlice.actions;
export default EmployeePersonalInfoSlice.reducer;
