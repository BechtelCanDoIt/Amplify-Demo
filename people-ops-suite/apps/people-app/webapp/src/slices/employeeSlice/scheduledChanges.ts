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

// A change waiting for its effective date.
//
// `changes` and `expected` are keyed by database column rather than by the payload
// field names the form uses, because that is the shape the scheduler applies and the
// backend stores. The UI maps them back to labels for display.
export interface ScheduledChange {
  id: number;
  employeeId: number;
  // Employee ID as people refer to it (LK1234), not the numeric key above. The reducer
  // checks it before accepting a response — see requestedFor. Optional because a
  // backend older than the field omits it; the reducer treats absent as "cannot say"
  // rather than as a mismatch.
  employeeIdentifier?: string;
  effectiveDate: string;
  changes: Record<string, unknown>;
  expected: Record<string, unknown>;
  status: string;
  appliedOn: string | null;
  failureReason: string | null;
  createdBy: string;
  createdOn: string;
}

interface ScheduledChangesState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  changes: ScheduledChange[];
  submitState: State;
  // Whose changes the newest request asked for. Each profile has its own URL, so the
  // shared cancel-token map never cancels the previous employee's request: both stay in
  // flight and can resolve in either order. Responses are matched against this before
  // they are accepted, so a slow one for the profile just left cannot paint its rows
  // under the name of the profile now open — rows the banner offers to cancel.
  requestedFor: string | null;
}

const initialState: ScheduledChangesState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  changes: [],
  submitState: State.idle,
  requestedFor: null,
};

export const fetchScheduledChanges = createAsyncThunk(
  "employees/fetchScheduledChanges",
  async (employeeId: string, { dispatch, rejectWithValue }) => {
    try {
      const response = await APIService.getInstance().get(
        AppConfig.serviceUrls.scheduledChanges(employeeId),
      );
      return {
        employeeId,
        changes: response.data as ScheduledChange[],
      };
    } catch (error: any) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage =
        error.response?.status === HttpStatusCode.InternalServerError
          ? "Error while fetching scheduled changes"
          : error.response?.data?.message ||
            "An unknown error occurred while fetching scheduled changes.";

      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const scheduleChange = createAsyncThunk(
  "employees/scheduleChange",
  async (
    {
      employeeId,
      effectiveDate,
      changes,
    }: {
      employeeId: string;
      effectiveDate: string;
      changes: Record<string, unknown>;
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const response = await APIService.getInstance().post(
        AppConfig.serviceUrls.scheduledChanges(employeeId),
        { effectiveDate, changes },
      );
      dispatch(
        enqueueSnackbarMessage({
          message: `Change scheduled for ${effectiveDate}.`,
          type: "success",
        }),
      );
      return response.data as { id: number };
    } catch (error: any) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      // A refused field or a past date comes back as a 400 with a reason worth
      // showing verbatim: it tells the admin exactly what cannot be scheduled.
      const errorMessage =
        error.response?.data?.message ||
        "An unknown error occurred while scheduling the change.";

      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const cancelScheduledChange = createAsyncThunk(
  "employees/cancelScheduledChange",
  async (
    { employeeId, changeId }: { employeeId: string; changeId: number },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().delete(
        AppConfig.serviceUrls.scheduledChange(employeeId, changeId),
      );
      dispatch(
        enqueueSnackbarMessage({
          message: "Scheduled change cancelled.",
          type: "success",
        }),
      );
      return changeId;
    } catch (error: any) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage =
        error.response?.data?.message ||
        "An unknown error occurred while cancelling the scheduled change.";

      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

const ScheduledChangesSlice = createSlice({
  name: "scheduledChanges",
  initialState,
  reducers: {
    resetScheduledChanges(state) {
      state.state = State.idle;
      state.stateMessage = null;
      state.errorMessage = null;
      state.changes = [];
      state.requestedFor = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduledChanges.pending, (state, action) => {
        state.state = State.loading;
        // The newest request wins: anything still in flight for a previous employee is
        // ignored when it lands.
        state.requestedFor = action.meta.arg;
        state.changes = [];
      })
      .addCase(fetchScheduledChanges.fulfilled, (state, action) => {
        const { employeeId, changes } = action.payload;
        if (employeeId !== state.requestedFor) return;
        // The rows carry the employee they belong to, so the check is against what the
        // server actually returned rather than against what this app believes it asked
        // for.
        //
        // Only a stated disagreement counts. A backend older than the field sends no
        // identifier at all, and treating that as a mismatch would empty the banner
        // with no way to tell why; the requestedFor check above still covers the
        // out-of-order case there, which is the one that actually happens.
        if (
          changes.some(
            (c) => c.employeeIdentifier && c.employeeIdentifier !== employeeId,
          )
        ) {
          state.state = State.failed;
          state.errorMessage = "Scheduled changes did not match the employee requested";
          state.changes = [];
          return;
        }
        state.state = State.success;
        state.changes = changes;
      })
      .addCase(fetchScheduledChanges.rejected, (state, action) => {
        if (action.meta.arg !== state.requestedFor) return;
        state.state = State.failed;
        state.errorMessage = action.payload as string;
      })
      .addCase(scheduleChange.pending, (state) => {
        state.submitState = State.loading;
      })
      .addCase(scheduleChange.fulfilled, (state) => {
        state.submitState = State.success;
      })
      .addCase(scheduleChange.rejected, (state) => {
        state.submitState = State.failed;
      })
      .addCase(cancelScheduledChange.fulfilled, (state, action) => {
        // Dropped locally rather than re-fetching: the row is gone from the pending
        // list either way, and the banner should not flicker while a fetch resolves.
        state.changes = state.changes.filter((c) => c.id !== action.payload);
      });
  },
});

export const { resetScheduledChanges } = ScheduledChangesSlice.actions;
export default ScheduledChangesSlice.reducer;
