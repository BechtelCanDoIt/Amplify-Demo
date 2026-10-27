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

import axios, { InternalAxiosRequestConfig } from "axios";
import { Logger } from "../utils/logger";
import { refreshToken } from "./auth";

// Variables/constants
let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

// Holds the refresh token promise
let refreshTokenPromise: Promise<string | null> | null = null;

// Axios instance
const apiClient = axios.create({});

/**
 * Request Interceptor - adds auth token to every request
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    Logger.info(
      `Making ${config.method?.toUpperCase()} request to: ${
        config.baseURL || ""
      }${config.url || ""}`,
    );

    // Use a singleton promise for token refresh
    if (!refreshTokenPromise) {
      refreshTokenPromise = refreshToken().finally(() => {
        refreshTokenPromise = null;
      });
    }

    try {
      const token = await refreshTokenPromise;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["Content-Type"] = "application/json";
      } else {
        Logger.warn("No token available for request");
      }
    } catch (error) {
      Logger.error("Failed to get token for request", error);
      return Promise.reject(error);
    }

    return config;
  },
  (error) => {
    Logger.error("Request interceptor error", error);
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor - handles 401 token refresh
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    Logger.info(
      `Successful response from ${response.config.method?.toUpperCase()} ${
        response.config.url
      }`,
    );
    return response;
  },
  async (error) => {
    if (error.code === axios.isCancel(error)) {
      return Promise.reject(error);
    }

    Logger.error(`API request failed`, {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
    });

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      Logger.warn("Received 401 unauthorized, attempting token refresh");

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshToken();
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        Logger.error("Token refresh failed", refreshError);
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
