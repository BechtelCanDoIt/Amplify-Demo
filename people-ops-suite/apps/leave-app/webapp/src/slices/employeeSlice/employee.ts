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
import axios, { HttpStatusCode } from "axios";

import { Employee, State } from "@/types/types";
import { SnackMessage } from "@config/constant";
import { fetchEmployees as fetchEmployeesService } from "@root/src/services/leaveService";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { RootState } from "@slices/store";

interface EmployeeState {
  state: State;
  employees: Employee[];
  errorMessage: string | null;
}

const initialState: EmployeeState = {
  state: State.idle,
  employees: [],
  errorMessage: null,
};

export const fetchEmployees = createAsyncThunk<Employee[], void, { rejectValue: string }>(
  "employee/fetchEmployees",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      return await fetchEmployeesService();
    } catch (err) {
      if (axios.isCancel(err)) {
        return rejectWithValue("Request was canceled.");
      }

      if (axios.isAxiosError(err)) {
        if (err.response?.status) {
          dispatch(
            enqueueSnackbarMessage({
              message:
                err.response.status === HttpStatusCode.InternalServerError
                  ? SnackMessage.error.fetchEmployees
                  : (err.response.data as { message?: string })?.message ??
                    SnackMessage.error.fetchEmployees,
              type: "error",
            }),
          );
        }
        return rejectWithValue(
          (err.response?.data as { message?: string })?.message ?? "Failed to fetch employees.",
        );
      }
      return rejectWithValue("Failed to fetch employees.");
    }
  },
);

const EmployeeSlice = createSlice({
  name: "employee",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.state = State.loading;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.state = State.success;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.state = State.failed;
        state.errorMessage = action.payload ?? null;
      });
  },
});

export const selectEmployeeState = (state: RootState) => state.employee.state;
export const selectEmployees = (state: RootState) => state.employee.employees;

export default EmployeeSlice.reducer;
