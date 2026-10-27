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

import { enableMapSet } from "immer";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@slices/authSlice/auth";
import commonReducer from "@slices/commonSlice/common";
import appConfigReducer from "@slices/configSlice/config";
import employeeReducer from "@slices/employeeSlice/employee";
import employeeHistoryReducer from "@slices/employeeSlice/employeeHistory";
import scheduledChangesReducer from "@slices/employeeSlice/scheduledChanges";
import employeePersonalInfoReducer from "@slices/employeeSlice/employeePersonalInfo";
import userReducer from "@slices/userSlice/user";
import organizationReducer from "@slices/organizationSlice/organization";
import masterDataReducer from "@slices/masterDataSlice/masterData";
import bulkOnboardingReducer from "@slices/bulkOnboardingSlice/bulkOnboarding";
import careerFunctionReducer from "@slices/careerFunctionSlice/careerFunction";
import leadershipReducer from "@slices/leadershipSlice/leadership";

enableMapSet();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    common: commonReducer,
    employee: employeeReducer,
    employeeHistory: employeeHistoryReducer,
    scheduledChanges: scheduledChangesReducer,
    employeePersonalInfo: employeePersonalInfoReducer,
    appConfig: appConfigReducer,
    organization: organizationReducer,
    masterData: masterDataReducer,
    bulkOnboarding: bulkOnboardingReducer,
    careerFunction: careerFunctionReducer,
    leadership: leadershipReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
