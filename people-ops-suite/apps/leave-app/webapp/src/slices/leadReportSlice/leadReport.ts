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

import { LeadReportRequest, LeadReportResponse, State } from "@/types/types";
import { SnackMessage } from "@config/constant";
import { getLeadReport as getLeadReportService } from "@root/src/services/leaveService";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";
import { RootState } from "@slices/store";

interface LeadReportState {
  state: State;
  report: LeadReportResponse | null;
  errorMessage: string | null;
}

const initialState: LeadReportState = {
  state: State.idle,
  report: null,
  errorMessage: null,
};

export const fetchLeadReport = createAsyncThunk<
  LeadReportResponse,
  LeadReportRequest,
  { rejectValue: string }
>("leadReport/fetchLeadReport", async (params, { dispatch, rejectWithValue }) => {
  try {
    const response = await getLeadReportService(params);
    dispatch(
      enqueueSnackbarMessage({
        message: SnackMessage.success.fetchLeadReportMessage,
        type: "success",
      }),
    );
    return response;
  } catch (err) {
    if (axios.isCancel(err)) {
      return rejectWithValue("Request canceled");
    }

    if (axios.isAxiosError(err)) {
      const errorMessage =
        (err.response?.data as { message?: string })?.message ??
        SnackMessage.error.fetchLeadReportMessage;
      dispatch(
        enqueueSnackbarMessage({
          message:
            err.response?.status === HttpStatusCode.InternalServerError
              ? SnackMessage.error.fetchLeadReportMessage
              : errorMessage,
          type: "error",
        }),
      );
      return rejectWithValue(errorMessage);
    }
    dispatch(
      enqueueSnackbarMessage({
        message: SnackMessage.error.fetchLeadReportMessage,
        type: "error",
      }),
    );
    return rejectWithValue("Failed to fetch lead report.");
  }
});

const LeadReportSlice = createSlice({
  name: "leadReport",
  initialState,
  reducers: {
    resetLeadReportState(state) {
      state.state = State.loading;
      state.report = null;
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeadReport.pending, (state) => {
        state.state = State.loading;
      })
      .addCase(fetchLeadReport.fulfilled, (state, action) => {
        state.state = State.success;
        state.report = action.payload;
      })
      .addCase(fetchLeadReport.rejected, (state, action) => {
        if (action.payload === "Request canceled" || action.meta.aborted) {
          return;
        }
        state.state = State.failed;
        state.errorMessage = action.payload ?? null;
      });
  },
});

export const { resetLeadReportState } = LeadReportSlice.actions;
export const selectLeadReportState = (state: RootState) => state.leadReport.state;
export const selectLeadReport = (state: RootState) => state.leadReport.report;

export default LeadReportSlice.reducer;
