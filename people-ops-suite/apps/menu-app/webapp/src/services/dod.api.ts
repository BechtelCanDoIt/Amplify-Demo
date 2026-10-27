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

import { DinnerRequest } from "@/types/types";
import { AppConfig } from "@config/config";
import { enqueueSnackbarMessage } from "@slices/commonSlice/common";

import { baseQueryWithRetry } from "./BaseQuery";

export const dodApi = createApi({
  reducerPath: "dodApi",
  baseQuery: baseQueryWithRetry,
  tagTypes: ["DinnerRequest"],
  endpoints: (builder) => ({
    getDinnerRequest: builder.query<DinnerRequest, void>({
      query: () => AppConfig.serviceUrls.dinner,
      providesTags: ["DinnerRequest"],
    }),
    submitDinnerRequest: builder.mutation<void, DinnerRequest>({
      query: (dinnerRequest) => ({
        url: AppConfig.serviceUrls.dinner,
        method: "POST",
        body: dinnerRequest,
      }),
      invalidatesTags: ["DinnerRequest"],
      async onQueryStarted(_payload, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            enqueueSnackbarMessage({
              message: `${_payload.mealOption} Dinner ordered successfully!`,
              type: "success",
            }),
          );
        } catch (error: any) {
          dispatch(
            enqueueSnackbarMessage({
              message: "Failed to order dinner. Try again...",
              type: "error",
            }),
          );
        }
      },
    }),
    deleteDinnerRequest: builder.mutation<void, void>({
      query: () => ({
        url: AppConfig.serviceUrls.dinner,
        method: "DELETE",
      }),
      invalidatesTags: ["DinnerRequest"],
      async onQueryStarted(_payload, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            enqueueSnackbarMessage({
              message: "Dinner request deleted successfully",
              type: "success",
            }),
          );
        } catch (error: any) {
          dispatch(
            enqueueSnackbarMessage({
              message: "Failed to delete dinner request, Try again...",
              type: "error",
            }),
          );
        }
      },
    }),
  }),
});

export const {
  useGetDinnerRequestQuery,
  useSubmitDinnerRequestMutation,
  useDeleteDinnerRequestMutation,
} = dodApi;
