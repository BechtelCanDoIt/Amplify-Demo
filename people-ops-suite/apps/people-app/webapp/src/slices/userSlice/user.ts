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
import { APIService } from "@utils/apiService";
import { UserState, UserInfoInterface } from "@slices/authSlice/auth";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { HttpStatusCode, isAxiosError, isCancel } from "axios";

const initialState: UserState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  userInfo: null,
  isProfileMissing: false,
};

type GetUserInfoResult = {
  UserInfo: UserInfoInterface | null;
  isProfileMissing: boolean;
};

type GetUserInfoReject = {
  status?: number;
  message: string;
};

export const getUserInfo = createAsyncThunk<
  GetUserInfoResult,
  void,
  { rejectValue: GetUserInfoReject }
>("user/getUserInfo", async (_, { rejectWithValue }) => {
  try {
    const resp = await APIService.getInstance().get(
      AppConfig.serviceUrls.userInfo,
    );
    return {
      UserInfo: resp.data as UserInfoInterface,
      isProfileMissing: false,
    };
  } catch (error: any) {
    if (isCancel(error)) return rejectWithValue({ message: "cancelled" });
    if (isAxiosError(error)) {
      const status = error.response?.status;

      if (status === HttpStatusCode.NotFound) {
        return { UserInfo: null, isProfileMissing: true };
      }

      if (
        status === HttpStatusCode.Unauthorized ||
        status === HttpStatusCode.Forbidden
      ) {
        return rejectWithValue({
          status,
          message:
            "Oops! Looks like you are not authorized to access this application.",
        });
      }
    }

    return rejectWithValue({
      message: "Something went wrong while authenticating the user.",
    });
  }
});

export const UserSlice = createSlice({
  name: "getUserInfo",
  initialState,
  reducers: {
    updateStateMessage: (state, action: PayloadAction<string>) => {
      state.stateMessage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserInfo.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Checking User Info...";
        state.errorMessage = null;
        state.isProfileMissing = false;
      })
      .addCase(getUserInfo.fulfilled, (state, action) => {
        state.userInfo = action.payload.UserInfo;
        state.isProfileMissing = action.payload.isProfileMissing;
        state.state = State.success;
        state.errorMessage = null;
      })
      .addCase(getUserInfo.rejected, (state, action) => {
        state.state = State.failed;
        state.isProfileMissing = false;
        const payload = action.payload as GetUserInfoReject | undefined;
        state.errorMessage =
          payload?.message ||
          "Something went wrong while authenticating the user.";
      });
  },
});

export const { updateStateMessage } = UserSlice.actions;

export default UserSlice.reducer;
