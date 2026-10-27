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
import axios, { HttpStatusCode } from "axios";
import { APIService } from "@utils/apiService";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";

const initialState: VisitorState = {
  state: State.idle,
  submitState: State.idle,
  stateMessage: "",
  errorMessage: "",
  visitor: null,
  backgroundProcess: false,
  backgroundProcessMessage: null,
};

interface VisitorState {
  state: State;
  submitState: State;
  stateMessage: string | null;
  errorMessage: string | null;
  visitor: Visitor | null;
  backgroundProcess: boolean;
  backgroundProcessMessage: string | null;
}

export interface Visitor extends AddVisitorPayload {
  createdBy: string;
  createdOn: string;
  updatedBy: string;
  updatedOn: string;
}

export interface AddVisitorPayload {
  firstName?: string;
  lastName?: string;
  idHash: string;
  contactNumber?: string;
  email?: string;
}

export const fetchVisitor = createAsyncThunk(
  "visitor/fetchVisitor",
  async (hashedEmailOrContact: string, { dispatch, rejectWithValue }) => {
    APIService.getCancelToken().cancel();
    const newCancelTokenSource = APIService.updateCancelToken();
    return new Promise<Visitor>((resolve, reject) => {
      APIService.getInstance()
        .get(AppConfig.serviceUrls.visitors + `/${hashedEmailOrContact}`, {
          cancelToken: newCancelTokenSource.token,
        })
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          if (axios.isCancel(error)) {
            return rejectWithValue("Request canceled");
          }
          if (error.response?.status === HttpStatusCode.NotFound) {
            dispatch(resetState());
          } else {
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
          }
        });
    });
  },
);

export const addVisitor = createAsyncThunk(
  "visitor/addVisitor",
  async (payload: AddVisitorPayload, { dispatch }) => {
    APIService.getCancelToken().cancel();
    const newCancelTokenSource = APIService.updateCancelToken();
    return new Promise<AddVisitorPayload>((resolve, reject) => {
      APIService.getInstance()
        .post(AppConfig.serviceUrls.visitors, payload, {
          cancelToken: newCancelTokenSource.token,
        })
        .then((response) => {
          resolve(response.data);
        })
        .catch((error) => {
          if (error.response?.status === HttpStatusCode.Conflict) {
            reject(error);
            return;
          }
          const errorMessage =
            error.response?.data?.message ||
            (error.response?.status === HttpStatusCode.InternalServerError
              ? error.response?.data?.message
              : "An error occurred during visitor creation!");
          dispatch(
            enqueueSnackbarMessage({
              message: errorMessage,
              type: "error",
            }),
          );
          reject(error);
        });
    });
  },
);

const VisitorSlice = createSlice({
  name: "visitors",
  initialState,
  reducers: {
    resetSubmitState(state) {
      state.submitState = State.idle;
      state.visitor = null;
    },
    resetState(state) {
      state.state = State.idle;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisitor.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Hang tight! We’re fetching visitor data...";
      })
      .addCase(fetchVisitor.fulfilled, (state, action) => {
        state.state = State.success;
        state.stateMessage = "Successfully fetched visitor data!";
        state.visitor = action.payload;
      })
      .addCase(fetchVisitor.rejected, (state, action) => {
        state.state = State.failed;
        state.stateMessage = "An error occurred during visitor fetching!";
      })
      .addCase(addVisitor.pending, (state) => {
        state.submitState = State.loading;
        state.stateMessage = "Hang tight! We’re adding your visitor...";
      })
      .addCase(addVisitor.fulfilled, (state, action) => {
        state.submitState = State.success;
        state.stateMessage = "Your visitor has been added successfully!";
      })
      .addCase(addVisitor.rejected, (state, action) => {
        state.submitState = State.failed;
        state.stateMessage = "An error occurred during visitor creation!";
      });
  },
});

export const { resetSubmitState, resetState } = VisitorSlice.actions;
export default VisitorSlice.reducer;
