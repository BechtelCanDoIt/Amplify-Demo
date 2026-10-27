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
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

import { UserInfoInterface, userApi } from "@services/user.api";
import { State } from "@utils/types";

export interface UserState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  userInfo: UserInfoInterface | null;
}

const initialState: UserState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  userInfo: null,
};

export const UserSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    updateStateMessage: (state, action: PayloadAction<string>) => {
      state.stateMessage = action.payload;
    },
    setUserInfo: (state, action: PayloadAction<UserInfoInterface>) => {
      state.userInfo = action.payload;
      state.state = State.success;
      state.errorMessage = null;
    },
    clearUserInfo: (state) => {
      state.userInfo = null;
      state.state = State.idle;
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    // Listen to RTK Query getUserInfo lifecycle
    builder
      .addMatcher(userApi.endpoints.getUserInfo.matchPending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Checking User Info...";
      })
      .addMatcher(userApi.endpoints.getUserInfo.matchFulfilled, (state, action) => {
        state.userInfo = action.payload;
        state.state = State.success;
        state.stateMessage = "Successfully fetched user info";
        state.errorMessage = null;
      })
      .addMatcher(userApi.endpoints.getUserInfo.matchRejected, (state, action) => {
        state.state = State.failed;
        state.stateMessage = null;
        if (action.payload?.status === 401) {
          state.errorMessage =
            "Oops! Looks like you are not authorized to access this application.";
        } else {
          state.errorMessage = "Something went wrong while authenticating the user.";
        }
      });
  },
});

export const { updateStateMessage, setUserInfo, clearUserInfo } = UserSlice.actions;

export default UserSlice.reducer;
