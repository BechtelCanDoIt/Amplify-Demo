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
import { createApi } from "@reduxjs/toolkit/query/react";

import { AppConfig } from "@config/config";
import { State } from "@slices/authSlice/auth";

import { baseQueryWithRetry } from "./BaseQuery";

export interface UserInfoInterface {
  employeeId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  employeeThumbnail: string | null;
  jobRole: string;
  privileges: number[];
  managerEmail: string;
  department: string;
  team: string;
}

export interface UserState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  userInfo: UserInfoInterface | null;
}

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseQueryWithRetry,
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getUserInfo: builder.query<UserInfoInterface, void>({
      query: () => AppConfig.serviceUrls.userInfo,
      providesTags: ["User"],
    }),
  }),
});

export const { useGetUserInfoQuery, useLazyGetUserInfoQuery } = userApi;
