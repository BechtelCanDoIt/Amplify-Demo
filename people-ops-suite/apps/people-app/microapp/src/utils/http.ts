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

import {
  getAccessToken,
  setIdToken,
  setAccessToken,
  getIdToken,
} from "./oauth";
import { getToken } from "../components/microapp-bridge";
import { jwtDecode } from "jwt-decode";
import { Logger } from "./logger";
import { ErrorMessages } from "./constants";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  url: string;
  method: HttpMethod;
  body?: any;
  successFn: (data: any) => void;
  failFn?: (error?: string) => void;
  loadingFn?: (isLoading: boolean) => void;
  headers?: HeadersInit;
  currentTry?: number;
}

const tokenRequestQueue: (() => void)[] = [];
let isTokenRequestInProgress = false;
const RETRY_BASE_DELAY_MS = 300;

const useHttp = () => {
  const MAX_TRIES = 4;
  const getRetryDelay = (currentTry: number): number =>
    RETRY_BASE_DELAY_MS * 2 ** (currentTry - 1);
  const waitForRetry = (delayMs: number) =>
    new Promise((resolve) => setTimeout(resolve, delayMs));
  const isIdempotentMethod = (httpMethod: string): boolean => {
    const normalizedMethod = httpMethod.toUpperCase();
    return (
      normalizedMethod === "GET" ||
      normalizedMethod === "HEAD" ||
      normalizedMethod === "OPTIONS" ||
      normalizedMethod === "PUT"
    );
  };
  const hasIdempotencyKey = (requestHeaders?: HeadersInit): boolean => {
    if (!requestHeaders) return false;

    if (requestHeaders instanceof Headers) {
      return requestHeaders.has("Idempotency-Key");
    }

    if (Array.isArray(requestHeaders)) {
      return requestHeaders.some(
        ([key]) => key.toLowerCase() === "idempotency-key",
      );
    }

    return Object.keys(requestHeaders).some(
      (key) => key.toLowerCase() === "idempotency-key",
    );
  };
  const isRetryableRequest = (
    httpMethod: HttpMethod,
    requestHeaders?: HeadersInit,
  ): boolean => isIdempotentMethod(httpMethod) || hasIdempotencyKey(requestHeaders);

  const handleRequest = async ({
    url,
    method,
    body,
    successFn,
    failFn,
    loadingFn,
    headers,
    currentTry = 1,
  }: RequestOptions): Promise<void> => {
    try {
      if (loadingFn) {
        loadingFn(true);
      }

      const token = getAccessToken();
      if (!token) throw new Error("Token not found");

      const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const requestHeaders = { ...defaultHeaders, ...headers };

      const response = await fetch(url, {
        method,
        body: body ? JSON.stringify(body) : null,
        headers: requestHeaders,
      });

      const responseText = await response.text();

      let responseBody: any = "";
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText);
        } catch (e) {
          Logger.error("Failed to parse JSON response", e);
          responseBody = responseText;
        }
      }

      if (response.status >= 200 && response.status < 300) {
        successFn(responseBody);
        if (loadingFn) loadingFn(false);
      } else {
        if (
          currentTry < MAX_TRIES &&
          isRetryableRequest(method, requestHeaders) &&
          (response.status >= 500 || response.status === 429)
        ) {
          await waitForRetry(getRetryDelay(currentTry));
          return handleRequest({
            url,
            method,
            body,
            successFn,
            failFn,
            loadingFn,
            headers,
            currentTry: currentTry + 1,
          });
        } else {
          const errorMessage = (() => {
            if (responseBody && typeof responseBody === "object") {
              const body = responseBody as Record<string, unknown>;
              const backendError = body.error;
              const backendMessage = body.message;
              const backendDetail = body.detail ?? body.details;
              const backendDescription = body.description;

              const candidate =
                (typeof backendError === "string" && backendError) ||
                (typeof backendMessage === "string" && backendMessage) ||
                (typeof backendDetail === "string" && backendDetail) ||
                (typeof backendDescription === "string" && backendDescription);

              if (candidate) return candidate;
            }

            return ErrorMessages.ERROR_MSG;
          })();

          Logger.error(errorMessage);
          if (failFn) failFn(errorMessage);
          if (loadingFn) loadingFn(false);
        }
      }
    } catch (err) {
      const errorMessage = String(err);
      const isMissingAuthError =
        errorMessage.includes("Token not found") ||
        errorMessage.includes("Token refresh failed");

      if (isMissingAuthError) {
        Logger.error(errorMessage);
        if (failFn) failFn(errorMessage);
        if (loadingFn) loadingFn(false);
        return;
      }

      if (currentTry < MAX_TRIES && isRetryableRequest(method, headers)) {
        await waitForRetry(getRetryDelay(currentTry));
        return handleRequest({
          url,
          method,
          body,
          successFn,
          failFn,
          loadingFn,
          headers,
          currentTry: currentTry + 1,
        });
      }
      Logger.error(errorMessage);
      if (failFn) failFn(errorMessage);
      if (loadingFn) loadingFn(false);
    }
  };

  const handleCheckGroups = (
    groupNames: string[] | string,
    resFn: (data: boolean) => void,
  ) => {
    const token = getIdToken();

    if (!token) {
      Logger.error("Jwt token not found");
      resFn(false);
    } else {
      const decoded = jwtDecode<{ groups?: string[] }>(token);
      const userGroups = decoded?.groups ?? [];

      // Normalize input to an array
      const requiredGroups = Array.isArray(groupNames)
        ? groupNames
        : [groupNames];

      const status = requiredGroups.some((group) => userGroups.includes(group));

      resFn(status);
    }
  };

  /**
   * Queue-based token refresh mechanism to prevent race conditions.
   *
   * Problem:
   * When multiple API calls detect an expired token at the same time, each tries to
   * refresh the token simultaneously. This causes multiple redundant token refresh
   * requests and leads to all callbacks being invoked multiple times.
   *
   * Solution:
   * We enqueue all pending callbacks and process them one by one using a flag (`isTokenRequestInProgress`)
   * to ensure only a single token refresh request is active at a time.
   * Once the token is refreshed, all queued callbacks are executed in order.
   *
   * This avoids race conditions and ensures that:
   * - Only one token refresh is sent to the server at a time
   * - All pending requests are resumed after a successful refresh
   */

  const handleRequestWithNewToken = (callback: () => void): void => {
    tokenRequestQueue.push(callback);
    processTokenQueue();
  };

  const processTokenQueue = () => {
    if (isTokenRequestInProgress || tokenRequestQueue.length === 0) return;
    isTokenRequestInProgress = true;

    const callback = tokenRequestQueue.shift();

    getToken((idToken: string | undefined) => {
      if (idToken) {
        setIdToken(idToken);
        setAccessToken(idToken);

        if (callback) {
          callback(); // Await the callback
        }
      } else {
        Logger.error("Token refresh failed");
      }

      isTokenRequestInProgress = false;
      processTokenQueue(); // Move to next in the queue
    });
  };

  return {
    handleRequest,
    handleRequestWithNewToken,
    handleCheckGroups,
  };
};

export default useHttp;

export function executeWithTokenHandling(
  handleRequest: ({
    url,
    method,
    body,
    successFn,
    failFn,
    loadingFn,
    headers,
    currentTry,
  }: RequestOptions) => Promise<void>,
  handleRequestWithNewToken: (callback: () => void) => void,
  url: string,
  method: HttpMethod,
  body: Object | null,
  successFn: (param: any) => void,
  failFn: (param: any) => void,
  loadingFn: (param: any) => void,
  headers?: HeadersInit | null,
) {
  handleRequestWithNewToken(() => {
    handleRequest({
      url,
      method,
      body,
      successFn,
      failFn,
      loadingFn,
      headers: headers ?? undefined,
    });
  });
}

export function getDisplayNameFromJwt(token: string) {
  try {
    const base64Url: string = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);

    return payload.given_name && payload.family_name
      ? payload.given_name + " " + payload.family_name
      : "Unknown Account";
  } catch (e) {
    Logger.error("Failed to decode JWT", e);
    return null;
  }
}

export function getEmailFromJwt(token: string) {
  try {
    const base64Url: string = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);

    return payload.email || payload.sub || null;
  } catch (e) {
    Logger.error("Failed to decode JWT", e);
    return null;
  }
}

export function getEmail(callback: (email: string | null) => void) {
  getToken((token) => {
    if (!token) return callback(null);

    const email = getEmailFromJwt(token);
    callback(email ? encodeURIComponent(email) : null);
  });
}

export async function getEmailAsync(): Promise<string> {
  return new Promise((resolve, reject) => {
    getEmail((email) => {
      if (!email) return reject("Email not found");
      resolve(email);
    });
  });
}
