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
import { FishIcon, Ham, LeafyGreen } from "lucide-react";

import { MealOption } from "@/types/types";

export const SnackMessage = {
  success: {
    addCollections: "Successfully added the Collection",
  },
  error: {
    fetchCollectionsMessage: "Unable to retrieve list of selected Collections",
    addCollections: "Unable to create the Collection",
    insufficientPrivileges: "Insufficient Privileges",
    fetchPrivileges: "Failed to fetch Privileges",
    fetchContacts: "Unable to retrieve list of Contacts",
    fetchEmployees: "Unable to retrieve list of Employees",
    fetchCustomers: "Unable to retrieve list of Customers",
    fetchAppConfigMessage: "Unable to retrieve app configurations",
  },
  warning: {},
};

export const APP_DESC = " Menu App";

export const redirectUrl = "menu-app-redirect-url";

export const localStorageTheme = "menu-app-theme";

export const PRIVILEGE_ADMIN = 789;

export const PRIVILEGE_EMPLOYEE = 987;

export const FEEDBACK_TIME = {
  START: [12, 0, 0, 0],
  END: [16, 15, 0, 0],
} as const;

export const MEAL_OPTIONS = [
  { value: "Chicken" as MealOption, label: "Chicken", icon: Ham },
  { value: "Fish" as MealOption, label: "Fish", icon: FishIcon },
  { value: "Vegetarian" as MealOption, label: "Vegetarian", icon: LeafyGreen },
] as const;

export const DOD_START_HOUR = 16;
export const DOD_END_HOUR = 19;
