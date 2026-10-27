// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import {
  QueryKey,
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { AxiosError, AxiosRequestConfig } from "axios";
import { useEffect, useRef } from "react";
import { Logger } from "../utils/logger";
import apiClient from "./apiClient";
import { Endpoint, HTTPMethod } from "./endpoints";

// Error Types
export enum ErrorTypes {
  CanceledError = "ERR_CANCELED",
  AbortError = "AbortError",
}

/**
 * Custom hook for GET requests using TanStack Query
 */
export const useGet = <TData>(
  queryKey: QueryKey,
  endpoint: Endpoint,
  options?: AxiosRequestConfig,
  enabled: boolean = true,
): UseQueryResult<TData, AxiosError> => {
  return useQuery<TData, AxiosError>({
    queryKey,
    enabled,
    queryFn: async () => {
      const url = constructURL(endpoint);
      try {
        const response = await apiClient.get<TData>(url, options);
        return response.data;
      } catch (error: any) {
        Logger.error("API GET Error: ", error.message);
        throw error;
      }
    },
  });
};

/**
 * Custom hook for mutations (POST, PUT, PATCH, DELETE) using TanStack Query
 */
export const useAPI = <TData, TVariables>(
  endpoint: Endpoint,
  method: HTTPMethod,
): UseMutationResult<TData, AxiosError, TVariables> => {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutationFn = async (variables: TVariables): Promise<TData> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const url = constructURL(endpoint);
    const response = await apiClient.request<TData>({
      url,
      method,
      data: variables,
      signal: abortController.signal,
    });
    return response.data;
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return useMutation<TData, AxiosError, TVariables>({
    mutationKey: [endpoint.path],
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint.path] });
    },
    onError: (error) => {
      if (
        error.name === ErrorTypes.AbortError ||
        error.code === ErrorTypes.CanceledError
      ) {
        Logger.warn("Request aborted.", error.message);
        return;
      }
      Logger.error("API Mutation Error.", error.message);
    },
  });
};

/**
 * Construct the URL for the endpoint
 */
const constructURL = (endpoint: Endpoint) => {
  return `${endpoint.baseUrl}${endpoint.path}`;
};
