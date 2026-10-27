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

// HTTP Methods
export type HTTPMethod = "POST" | "GET" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint {
  baseUrl: string;
  path: string;
  httpMethod: HTTPMethod;
  cacheEnabled?: boolean;
}

export const BASE_URL =
  process.env.REACT_APP_BACKEND_BASE_URL &&
  process.env.REACT_APP_BACKEND_BASE_URL.trim() !== ""
    ? process.env.REACT_APP_BACKEND_BASE_URL
    : "";

/**
 * Helper to build a URL with query parameters
 */
const buildPathWithParams = (
  basePath: string,
  params?: Record<string, string | number | boolean>,
): string => {
  if (!params) return basePath;

  const searchParams = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
};

// Visitor App Endpoints
export const Endpoints = {
  // User info
  getUserInfo: (): Endpoint => ({
    baseUrl: BASE_URL,
    path: "/user-info",
    httpMethod: "GET",
    cacheEnabled: false,
  }),

  // Visitors
  getVisitor: (hashedId: string): Endpoint => ({
    baseUrl: BASE_URL,
    path: `/visitors/${hashedId}`,
    httpMethod: "GET",
    cacheEnabled: false,
  }),

  addVisitor: (): Endpoint => ({
    baseUrl: BASE_URL,
    path: "/visitors",
    httpMethod: "POST",
    cacheEnabled: false,
  }),

  // Visits
  getVisits: (params?: {
    limit: number;
    offset: number;
    inviter?: string;
    statusArray?: string;
  }): Endpoint => ({
    baseUrl: BASE_URL,
    path: buildPathWithParams("/visits", params as any),
    httpMethod: "GET",
    cacheEnabled: false,
  }),

  addVisit: (): Endpoint => ({
    baseUrl: BASE_URL,
    path: "/visits",
    httpMethod: "POST",
    cacheEnabled: false,
  }),

  // Employees
  getEmployees: (params?: {
    search?: string;
    offset?: number;
    limit?: number;
  }): Endpoint => ({
    baseUrl: BASE_URL,
    path: buildPathWithParams("/employees", params as any),
    httpMethod: "GET",
    cacheEnabled: false,
  }),

  // Building resources
  getBuildingResources: (): Endpoint => ({
    baseUrl: BASE_URL,
    path: "/building-resources",
    httpMethod: "GET",
    cacheEnabled: true,
  }),
};
