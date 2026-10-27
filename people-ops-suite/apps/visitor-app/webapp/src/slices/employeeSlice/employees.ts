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

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { APIService } from "@utils/apiService";
import { AppConfig } from "@config/config";
import { State } from "@/types/types";

const CACHE_DURATION = 300000;
const PAGE_SIZE = 10;

interface EmployeesState {
  state: State;
  stateMessage: string | null;
  errorMessage: string | null;
  employees: Employee[];
  lastFetched: number | null;
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentSearchTerm: string;
  cache: Record<string, EmployeeCache>;
}

const initialState: EmployeesState = {
  state: State.idle,
  stateMessage: "",
  errorMessage: "",
  employees: [],
  lastFetched: null,
  currentPage: 0,
  hasMore: true,
  isLoadingMore: false,
  currentSearchTerm: "",
  cache: {},
};

export interface Employee {
  firstName: string;
  lastName: string;
  workEmail: string;
  employeeThumbnail: string | null;
}

interface EmployeeCache {
  employees: Employee[];
  hasMore: boolean;
  lastFetched: number;
}

export const fetchEmployees = createAsyncThunk(
  "employees/fetchEmployees",
  async (
    {
      searchTerm = "",
      offset = 0,
      limit = PAGE_SIZE,
    }: {
      searchTerm?: string;
      offset?: number;
      limit?: number;
    },
    { getState },
  ) => {
    const state = getState() as { employees: EmployeesState };
    const trimmedSearch = searchTerm.trim();
    const cacheKey = trimmedSearch;

    const cachedData = state.employees.cache[cacheKey];
    if (cachedData && Date.now() - cachedData.lastFetched < CACHE_DURATION) {
      return {
        employees: cachedData.employees,
        hasMore: cachedData.hasMore,
        fromCache: true,
      };
    }

    if (trimmedSearch.length > 0) {
      for (let i = trimmedSearch.length - 1; i > 0; i--) {
        const prefix = trimmedSearch.substring(0, i);
        const prefixCache = state.employees.cache[prefix];

        if (
          prefixCache &&
          Date.now() - prefixCache.lastFetched < CACHE_DURATION
        ) {
          const filteredEmployees = prefixCache.employees.filter((emp) =>
            emp.workEmail.toLowerCase().startsWith(trimmedSearch.toLowerCase()),
          );

          return {
            employees: filteredEmployees,
            hasMore: false,
            fromCache: true,
            searchTerm: trimmedSearch,
          };
        }
      }
    }

    return new Promise<{
      employees: Employee[];
      hasMore: boolean;
      fromCache?: boolean;
      searchTerm?: string;
    }>((resolve, reject) => {
      const search = trimmedSearch || "";
      APIService.getInstance()
        .get(`${AppConfig.serviceUrls.employeesInfo}`, {
          params: { search, offset, limit },
        })
        .then((response: any) => {
          const employees: Employee[] = response.data || [];
          const hasMore = employees.length === limit;
          resolve({ employees, hasMore, fromCache: false });
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  },
);

export const loadMoreEmployees = createAsyncThunk(
  "employees/loadMoreEmployees",
  async ({ searchTerm = "" }: { searchTerm?: string }, { getState }) => {
    const state = getState() as { employees: EmployeesState };
    const { currentPage, hasMore, currentSearchTerm } = state.employees;

    if (!hasMore) {
      return {
        employees: [],
        hasMore: false,
        searchTerm: currentSearchTerm,
      };
    }

    const offset = (currentPage + 1) * PAGE_SIZE;
    const search = searchTerm.trim() || "";

    return new Promise<{
      employees: Employee[];
      hasMore: boolean;
      searchTerm: string;
    }>((resolve, reject) => {
      APIService.getInstance()
        .get(`${AppConfig.serviceUrls.employeesInfo}`, {
          params: { search, offset, limit: PAGE_SIZE },
        })
        .then((response: any) => {
          const employees: Employee[] = response.data || [];
          const hasMore = employees.length === PAGE_SIZE;
          resolve({
            employees,
            hasMore,
            searchTerm: search,
          });
        })
        .catch((error: Error) => {
          reject(error);
        });
    });
  },
);

// Employees Slice
const employeesSlice = createSlice({
  name: "employees",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.currentSearchTerm = action.payload;
    },
    resetEmployees: (state) => {
      state.employees = [];
      state.currentPage = 0;
      state.hasMore = true;
      state.state = State.idle;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state, action) => {
        const hasSearchTerm =
          action.meta.arg.searchTerm &&
          action.meta.arg.searchTerm.trim() !== "";
        const isInitialLoad =
          state.employees.length === 0 &&
          action.meta.arg.offset === 0 &&
          !hasSearchTerm;
        if (isInitialLoad) {
          state.state = State.loading;
          state.stateMessage = "Fetching emails...";
        } else {
          state.isLoadingMore = true;
        }
        state.errorMessage = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        const { employees, hasMore } = action.payload;
        const searchTerm = action.meta.arg.searchTerm?.trim() || "";

        state.cache[searchTerm] = {
          employees,
          hasMore,
          lastFetched: Date.now(),
        };

        state.employees = employees;
        state.hasMore = hasMore;
        state.currentPage = 0;
        state.currentSearchTerm = searchTerm;
        state.state = State.success;
        state.stateMessage = "Successfully fetched!";
        state.lastFetched = Date.now();
        state.isLoadingMore = false;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        const isInitialLoad =
          state.employees.length === 0 &&
          action.meta.arg.offset === 0 &&
          !action.meta.arg.searchTerm;
        if (isInitialLoad) {
          state.state = State.failed;
        } else {
          state.state = State.success;
        }
        state.stateMessage = "Failed to fetch!";
        state.errorMessage = action.error.message || "Unknown error";
        state.isLoadingMore = false;
      })
      .addCase(loadMoreEmployees.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(loadMoreEmployees.fulfilled, (state, action) => {
        const { employees: newEmployees, hasMore, searchTerm } = action.payload;
        const updatedEmployees = [...state.employees, ...newEmployees];

        state.employees = updatedEmployees;
        state.hasMore = hasMore;
        state.currentPage += 1;
        state.isLoadingMore = false;

        state.cache[searchTerm] = {
          employees: updatedEmployees,
          hasMore,
          lastFetched: Date.now(),
        };
      })
      .addCase(loadMoreEmployees.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.errorMessage = action.error.message || "Failed to load more";
      });
  },
});
export const { setSearchTerm, resetEmployees } = employeesSlice.actions;
export default employeesSlice.reducer;
export { CACHE_DURATION, PAGE_SIZE };
