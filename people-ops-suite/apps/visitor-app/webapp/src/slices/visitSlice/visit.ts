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

import axios, { HttpStatusCode } from "axios";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { State } from "@/types/types";
import { APIService } from "@utils/apiService";

import { enqueueSnackbarMessage } from "@slices/commonSlice/common";

import { AppConfig } from "@config/config";

interface VisitState {
  state: State;
  submitState: State;
  visits: FetchVisitsResponse | null;
  currentVisit: Visit | null;
  currentVisitState: State;
  stateMessage: string | null;
  errorMessage: string | null;
  backgroundProcess: boolean;
  backgroundProcessMessage: string | null;
}

export interface FloorRoom {
  floor: string;
  rooms: string[];
}

export interface AddVisitPayload {
  companyName?: string;
  passNumber?: string;
  whomTheyMeet: string;
  purposeOfVisit?: string;
  accessibleLocations?: FloorRoom[] | null;
  timeOfEntry?: string;
  timeOfDeparture?: string;
  visitorIdHash: string;
  visitDate: string;
  uuid: string;
  qrCode?: number[];
}

export interface Visit {
  id: number;
  firstName: string | null;
  lastName: string | null;
  visitDate: string;
  contactNumber: string | null;
  email: string;
  emailHash: string;
  companyName: string | null;
  passNumber: string | null;
  whomTheyMeet: string | null;
  purposeOfVisit: string | null;
  accessibleLocations: FloorRoom[] | null;
  timeOfEntry: string | null;
  timeOfDeparture: string | null;
  status: string;
  createdBy: string;
  createdOn: string;
  updatedBy: string;
  updatedOn: string;
  invitationId: number | null;
}

export interface FetchVisitsResponse {
  totalCount: number;
  visits: Visit[];
}

export interface UpdateVisitPayload {
  rejectionReason: string | null | undefined;
  passNumber?: string | null;
  accessibleLocations?: FloorRoom[] | null;
  visitId: number;
  status: string;
}

const initialState: VisitState = {
  state: State.idle,
  submitState: State.idle,
  visits: null,
  currentVisit: null,
  currentVisitState: State.idle,
  stateMessage: null,
  errorMessage: null,
  backgroundProcess: false,
  backgroundProcessMessage: null,
};

export const addVisit = createAsyncThunk(
  "visit/addVisit",
  async (payload: AddVisitPayload, { dispatch }) => {
    APIService.getCancelToken().cancel();
    const newCancelTokenSource = APIService.updateCancelToken();
    if (payload.passNumber === "") delete payload.passNumber;
    if (payload.accessibleLocations?.length === 0)
      delete payload.accessibleLocations;
    return new Promise<AddVisitPayload>((resolve, reject) => {
      APIService.getInstance()
        .post(AppConfig.serviceUrls.visits, payload, {
          cancelToken: newCancelTokenSource.token,
        })
        .then((response) => {
          dispatch(
            enqueueSnackbarMessage({
              message:
                response.data.message ||
                "Your visit has been added successfully!",
              type: "success",
            }),
          );
          resolve(response.data);
        })
        .catch((error) => {
          dispatch(
            enqueueSnackbarMessage({
              message:
                error.response?.status === HttpStatusCode.InternalServerError
                  ? error.response?.data?.message
                  : "An error occurred while adding visit!",
              type: "error",
            }),
          );
          reject(error);
        });
    });
  },
);

export const fetchVisits = createAsyncThunk(
  "visit/fetchVisits",
  async (
    {
      limit,
      offset,
      inviter,
      statusArray,
    }: {
      limit: number;
      offset: number;
      inviter?: string;
      statusArray?: string[];
    },
    { dispatch, rejectWithValue },
  ) => {
    APIService.getCancelToken().cancel();
    const newCancelTokenSource = APIService.updateCancelToken();
    return new Promise<FetchVisitsResponse>((resolve, reject) => {
      APIService.getInstance()
        .get(AppConfig.serviceUrls.visits, {
          params: {
            limit,
            offset,
            inviter,
            statusArray: statusArray?.join(","),
          },
          cancelToken: newCancelTokenSource.token,
        })
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          if (axios.isCancel(error)) {
            return rejectWithValue("Request canceled");
          }
          dispatch(
            enqueueSnackbarMessage({
              message:
                error.response?.status === HttpStatusCode.InternalServerError
                  ? error.response?.data?.message
                  : "An unknown error occurred.",
              type: "error",
            }),
          );
          reject(error);
        });
    });
  },
);

export const fetchSingleVisit = createAsyncThunk(
  "visit/fetchSingleVisit",
  async (visitVerificationCode: string, { dispatch, rejectWithValue }) => {
    APIService.getCancelToken().cancel();
    const newCancelTokenSource = APIService.updateCancelToken();
    return new Promise<Visit>((resolve, reject) => {
      APIService.getInstance()
        .get(`${AppConfig.serviceUrls.visits}/${visitVerificationCode}`, {
          cancelToken: newCancelTokenSource.token,
        })
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          if (axios.isCancel(error)) {
            return rejectWithValue("Request canceled");
          }
          dispatch(
            enqueueSnackbarMessage({
              message:
                error.response?.status === HttpStatusCode.InternalServerError
                  ? error.response?.data?.message
                  : "An error occurred while fetching visit details!",
              type: "error",
            }),
          );
          reject(error);
        });
    });
  },
);

export const visitStatusUpdate = createAsyncThunk(
  "visit/visitStatusUpdate",
  async (payload: UpdateVisitPayload, { dispatch, rejectWithValue }) => {
    APIService.getCancelToken().cancel();
    const newCancelTokenSource = APIService.updateCancelToken();

    return new Promise<{ message: string }>((resolve, reject) => {
      APIService.getInstance()
        .post(
          `${AppConfig.serviceUrls.visits}/${payload.visitId}/${payload.status}`,
          {
            rejectionReason: payload.rejectionReason,
            passNumber: payload.passNumber,
            accessibleLocations: payload.accessibleLocations,
          },
          {
            cancelToken: newCancelTokenSource.token,
          },
        )
        .then((response) => {
          dispatch(
            enqueueSnackbarMessage({
              message: `Visit status updated to "${payload.status}" successfully!`,
              type: "success",
            }),
          );
          resolve(response.data);
        })
        .catch((error) => {
          dispatch(
            enqueueSnackbarMessage({
              message:
                error.response?.data?.message ??
                "An error occurred while updating visit status!",
              type: "error",
            }),
          );
          reject(error);
        });
    });
  },
);

const VisitSlice = createSlice({
  name: "visits",
  initialState,
  reducers: {
    resetSubmitState(state) {
      state.submitState = State.idle;
    },
    resetState(state) {
      state.state = State.idle;
    },
    resetStatusUpdateState(state) {
      state.submitState = State.idle;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addVisit.pending, (state) => {
        state.submitState = State.loading;
        state.stateMessage = "Hang tight! We’re adding your visit...";
      })
      .addCase(addVisit.fulfilled, (state, action) => {
        state.submitState = State.success;
        state.stateMessage = "Your visit has been added successfully!";
      })
      .addCase(addVisit.rejected, (state, action) => {
        state.submitState = State.failed;
        state.stateMessage = "Oops! An error occurred during visit creation!";
      })
      .addCase(fetchVisits.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Hang tight! We’re fetching your visits...";
        state.errorMessage = null;
      })
      .addCase(
        fetchVisits.fulfilled,
        (state, action: PayloadAction<FetchVisitsResponse>) => {
          state.state = State.success;
          state.visits = action.payload;
          state.stateMessage = "Your visits have been fetched successfully!";
        },
      )
      .addCase(fetchVisits.rejected, (state, action) => {
        state.state = State.failed;
        state.stateMessage =
          "Oops! Something went wrong while fetching visits!";
        state.errorMessage =
          (action.payload as string) || "Failed to fetch visits";
      })
      .addCase(fetchSingleVisit.pending, (state) => {
        state.currentVisitState = State.loading;
        state.currentVisit = null;
        state.stateMessage = "Loading visit details...";
        state.errorMessage = null;
      })
      .addCase(
        fetchSingleVisit.fulfilled,
        (state, action: PayloadAction<Visit>) => {
          state.currentVisitState = State.success;
          state.currentVisit = action.payload;
          state.stateMessage = "Visit details loaded successfully!";
          state.errorMessage = null;
        },
      )
      .addCase(fetchSingleVisit.rejected, (state, action) => {
        state.currentVisitState = State.failed;
        state.currentVisit = null;
        state.stateMessage = "Failed to load visit details!";
        state.errorMessage =
          (action.payload as string) || "Failed to fetch visit";
      })
      .addCase(visitStatusUpdate.pending, (state) => {
        state.submitState = State.loading;
        state.stateMessage = "Hang tight! We’re updating visit status...";
      })
      .addCase(
        visitStatusUpdate.fulfilled,
        (state, action: PayloadAction<{ message: string }>) => {
          state.submitState = State.success;
          state.stateMessage = action.payload.message;
        },
      )
      .addCase(visitStatusUpdate.rejected, (state, action) => {
        state.submitState = State.failed;
        state.stateMessage =
          (action.payload as string) || "Failed to update visit status";
      });
  },
});

export const { resetSubmitState, resetState, resetStatusUpdateState } =
  VisitSlice.actions;
export default VisitSlice.reducer;
