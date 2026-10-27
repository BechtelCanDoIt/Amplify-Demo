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

import { enqueueSnackbarMessage } from "@slices/commonSlice/common";

import { baseQueryWithRetry } from "./BaseQuery";

interface FeedbackRequest {
  message: string;
  mealType?: string;
}

export interface RawMetaData {
  title: string;
  description: string;
}

export interface RawMenu {
  date: string;
  breakfast: RawMetaData;
  juice: RawMetaData;
  lunch: RawMetaData;
  dessert: RawMetaData;
  snack: RawMetaData;
}

export interface MetaData {
  title: string | null;
  description: string | null;
}

export interface Menu {
  date: string;
  breakfast: MetaData;
  juice: MetaData;
  lunch: MetaData;
  dessert: MetaData;
  snack: MetaData;
}

const transformMetaData = (data: RawMetaData): MetaData => ({
  title: data.title.trim() === "" ? null : data.title.trim(),
  description: data.description.trim() === "" ? null : data.description.trim(),
});

const transformMenuResponse = (response: RawMenu): Menu => ({
  date: response.date,
  breakfast: transformMetaData(response.breakfast),
  juice: transformMetaData(response.juice),
  lunch: transformMetaData(response.lunch),
  dessert: transformMetaData(response.dessert),
  snack: transformMetaData(response.snack),
});

export const menuApi = createApi({
  reducerPath: "menuApi",
  baseQuery: baseQueryWithRetry,
  tagTypes: ["Menu"],
  endpoints: (builder) => ({
    getMenu: builder.query<Menu, void>({
      query: () => "menu",
      providesTags: ["Menu"],
      transformResponse: (response: RawMenu) => transformMenuResponse(response),
    }),
    submitFeedback: builder.mutation<void, FeedbackRequest>({
      query: (feedback) => ({
        url: "feedback",
        method: "POST",
        body: feedback,
      }),
      invalidatesTags: ["Menu"],
      async onQueryStarted(_payload, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            enqueueSnackbarMessage({
              message: "Meal feedback submitted successfully",
              type: "success",
            }),
          );
        } catch (error: any) {
          dispatch(
            enqueueSnackbarMessage({
              message: "Failed to submit meal feedback. Try again...",
              type: "error",
            }),
          );
        }
      },
    }),
  }),
});

export const { useGetMenuQuery, useSubmitFeedbackMutation } = menuApi;
