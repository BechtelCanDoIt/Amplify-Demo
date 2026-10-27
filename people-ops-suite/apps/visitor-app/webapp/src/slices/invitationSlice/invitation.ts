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

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

import { AppConfig } from "@config/config";
import { APIService } from "@root/src/utils/apiService";

import { enqueueSnackbarMessage } from "../commonSlice/common";

import { State } from "@/types/types";

interface Invitee {
  nicHash: string;
  name: string;
  nicNumber: string;
  contactNumber: string;
  email: string | null;
}

interface InvitationResponse {
  invitationId: number;
  inviteeEmail: string;
  active: boolean;
  noOfVisitors: number;
  visitInfo: VisitDetails;
  invitees: Invitee[];
  createdBy: string;
  createdOn: string;
  updatedBy: string;
  updatedOn: string;
}

interface AccessibleLocation {
  floor: string;
  rooms: string[];
}

interface VisitData {
  visitors: Invitee[];
  visitDetails: VisitDetails;
}

interface InvitationState {
  loading: boolean;
  error: string | null;
  submitState: State;
  fetchState: State;
  visitInvitation: InvitationResponse | null;
}

interface Invitation {
  noOfVisitors: number;
  inviteeEmail: string;
}

export interface VisitDetails {
  companyName: string;
  whomTheyMeet: string;
  purposeOfVisit: string;
  accessibleLocations?: AccessibleLocation[] | null;
  scheduledDate?: string;
  timeOfEntry: string;
  timeOfDeparture: string;
}

const initialState: InvitationState = {
  loading: false,
  error: null,
  submitState: State.idle,
  fetchState: State.idle,
  visitInvitation: null,
};

export const sendInvitation = createAsyncThunk<
  Invitation,
  Invitation,
  { rejectValue: string }
>(
  "invitation/sendInvitation",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      APIService.getCancelToken().cancel();
      const newCancelTokenSource = APIService.updateCancelToken();

      const response = await APIService.getInstance().post(
        AppConfig.serviceUrls.invitations,
        payload,
        {
          cancelToken: newCancelTokenSource.token,
        },
      );

      dispatch(
        enqueueSnackbarMessage({
          message: "Invitation sent successfully!",
          type: "success",
        }),
      );

      return response.data;
    } catch (err) {
      dispatch(
        enqueueSnackbarMessage({
          message: "An error occurred while sending invitation!",
          type: "error",
        }),
      );

      return rejectWithValue("An error occurred while sending invitation!");
    }
  },
);

export const submitVisitAsync = createAsyncThunk<
  VisitData,
  { visitData: VisitData; invitationId: string },
  { rejectValue: string }
>(
  "invitation/submitVisit",
  async ({ visitData, invitationId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await fetch(
        `${AppConfig.serviceUrls.invitations}/${invitationId}/fill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...visitData.visitors[0],
            ...visitData.visitDetails,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      dispatch(
        enqueueSnackbarMessage({
          message: "Visitors submitted successfully",
          type: "success",
        }),
      );
      return data;
    } catch (error) {
      dispatch(
        enqueueSnackbarMessage({
          message: "Failed to submit visitors",
          type: "error",
        }),
      );
      return rejectWithValue("Failed to submit visit");
    }
  },
);

export const getVisitInvitationAsync = createAsyncThunk<
  InvitationResponse,
  string,
  { rejectValue: string }
>(
  "invitation/getVisitInvitation",
  async (invitationId, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${AppConfig.serviceUrls.invitations}/${invitationId}/authorize`,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch invitation",
      );
    }
  },
);

const invitationSlice = createSlice({
  name: "invitation",
  initialState,
  reducers: {
    resetInvitationState: (state) => {
      state.loading = false;
      state.error = null;
    },
    resetSubmitState: (state) => {
      state.submitState = State.idle;
    },
    resetFetchState: (state) => {
      state.fetchState = State.idle;
      state.visitInvitation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendInvitation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        sendInvitation.fulfilled,
        (state, action: PayloadAction<Invitation>) => {
          state.loading = false;
        },
      )
      .addCase(sendInvitation.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error.message || "Something went wrong";
      })
      .addCase(submitVisitAsync.pending, (state) => {
        state.submitState = State.loading;
      })
      .addCase(
        submitVisitAsync.fulfilled,
        (state, action: PayloadAction<VisitData>) => {
          state.submitState = State.success;
        },
      )
      .addCase(submitVisitAsync.rejected, (state, action) => {
        state.submitState = State.failed;
      })
      .addCase(getVisitInvitationAsync.pending, (state) => {
        state.fetchState = State.loading;
        state.error = null;
      })
      .addCase(
        getVisitInvitationAsync.fulfilled,
        (state, action: PayloadAction<InvitationResponse>) => {
          state.fetchState = State.success;
          state.visitInvitation = action.payload;
          state.error = null;
        },
      )
      .addCase(getVisitInvitationAsync.rejected, (state, action) => {
        state.fetchState = State.failed;
        state.error = action.payload as string;
      });
  },
});

export const { resetInvitationState, resetSubmitState, resetFetchState } =
  invitationSlice.actions;

export default invitationSlice.reducer;
