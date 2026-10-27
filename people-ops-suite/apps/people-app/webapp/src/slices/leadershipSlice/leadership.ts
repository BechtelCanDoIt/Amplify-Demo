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

export interface LeadershipGroup {
  id: number;
  name: string;
  isActive: boolean;
}

/** A leadership attribute as the master data screen lists it, retired ones included. */
export interface LeadershipGroupWithUsage extends LeadershipGroup {
  /** Active and Marked-leaver employees holding it; these block retiring it. */
  holderCount: number;
}

export interface CreateLeadershipGroupPayload {
  name: string;
}

export interface UpdateLeadershipGroupPayload {
  name?: string;
  /** false retires the attribute, true reactivates it. */
  isActive?: boolean;
}

interface LeadershipState {
  /** Active attributes, for the assignment dropdown and report filter. */
  groups: LeadershipGroup[];
  state: State;
  /** Every attribute with its holder count, for the master data screen. */
  allGroups: LeadershipGroupWithUsage[];
  allGroupsState: State;
}

const initialState: LeadershipState = {
  groups: [],
  state: State.idle,
  allGroups: [],
  allGroupsState: State.idle,
};

export const fetchLeadershipGroups = createAsyncThunk(
  "leadership/fetchLeadershipGroups",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const resp = await APIService.getInstance().get(
        AppConfig.serviceUrls.leadershipGroups,
      );
      if (!Array.isArray(resp.data)) {
        throw new Error(
          "Invalid response: leadership attributes should be an array",
        );
      }
      return resp.data as LeadershipGroup[];
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error fetching leadership attributes";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const fetchAllLeadershipGroups = createAsyncThunk(
  "leadership/fetchAllLeadershipGroups",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // The flag goes in the URL itself: the API client cancels any in-flight request to
      // the same URL, and the master data page also refreshes the active list, which
      // would otherwise cancel this one.
      const resp = await APIService.getInstance().get(
        `${AppConfig.serviceUrls.leadershipGroups}?includeInactive=true`,
      );
      if (!Array.isArray(resp.data)) {
        throw new Error(
          "Invalid response: leadership attributes should be an array",
        );
      }
      return resp.data as LeadershipGroupWithUsage[];
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error fetching leadership attributes";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const createLeadershipGroup = createAsyncThunk(
  "leadership/createLeadershipGroup",
  async (
    payload: CreateLeadershipGroupPayload,
    { dispatch, rejectWithValue },
  ) => {
    try {
      const resp = await APIService.getInstance().post(
        AppConfig.serviceUrls.leadershipGroups,
        payload,
      );
      dispatch(
        enqueueSnackbarMessage({
          message: "Leadership attribute created",
          type: "success",
        }),
      );
      return resp.data as number;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error creating leadership attribute";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

export const updateLeadershipGroup = createAsyncThunk(
  "leadership/updateLeadershipGroup",
  async (
    { id, payload }: { id: number; payload: UpdateLeadershipGroupPayload },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await APIService.getInstance().patch(
        AppConfig.serviceUrls.leadershipGroup(id),
        payload,
      );
      dispatch(
        enqueueSnackbarMessage({
          message: "Leadership attribute updated",
          type: "success",
        }),
      );
      return id;
    } catch (error: unknown) {
      if (isCancel(error)) return rejectWithValue("cancelled");
      const errorMessage = isAxiosError(error)
        ? (error.response?.data?.message ?? error.message)
        : "Error updating leadership attribute";
      dispatch(enqueueSnackbarMessage({ message: errorMessage, type: "error" }));
      return rejectWithValue(errorMessage);
    }
  },
);

const leadershipSlice = createSlice({
  name: "leadership",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeadershipGroups.pending, (state) => {
        state.state = State.loading;
      })
      .addCase(fetchLeadershipGroups.fulfilled, (state, action) => {
        state.state = State.success;
        state.groups = action.payload;
      })
      .addCase(fetchLeadershipGroups.rejected, (state) => {
        state.state = State.failed;
      })
      .addCase(fetchAllLeadershipGroups.pending, (state) => {
        state.allGroupsState = State.loading;
      })
      .addCase(fetchAllLeadershipGroups.fulfilled, (state, action) => {
        state.allGroupsState = State.success;
        state.allGroups = action.payload;
      })
      .addCase(fetchAllLeadershipGroups.rejected, (state) => {
        state.allGroupsState = State.failed;
      });
  },
});

export default leadershipSlice.reducer;
