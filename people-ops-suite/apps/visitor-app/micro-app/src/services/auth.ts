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

import { jwtDecode } from "jwt-decode";
import { bridgeLog, getToken } from "../microapp-bridge";
import { User, useUserStore } from "../stores/user/user";
import { LocalStorageKeys } from "../utils/constants";
import { Logger } from "../utils/logger";

// Token Payload
interface TokenPayload {
  email?: string;
  name?: string;
  groups?: string[];
  given_name: string;
  family_name: string;
}

// Token storage functions
export const getAccessToken = (): string | null =>
  localStorage.getItem(LocalStorageKeys.accessToken);
export const setAccessToken = (token: string): void =>
  localStorage.setItem(LocalStorageKeys.accessToken, token);
export const getIdToken = (): string | null =>
  localStorage.getItem(LocalStorageKeys.idToken);
export const setIdToken = (token: string): void =>
  localStorage.setItem(LocalStorageKeys.idToken, token);

/**
 * Refresh the token via native bridge
 */
export const refreshToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    getToken((newIdToken: string | undefined) => {
      if (newIdToken) {
        setIdToken(newIdToken);
        setAccessToken(newIdToken);

        try {
          initializeUserFromToken();
        } catch (error) {
          Logger.warn(
            "Failed to update user information after token refresh",
            error,
          );
        }

        resolve(newIdToken);
      } else {
        Logger.error("Failed to refresh token");
        useUserStore.getState().clearUser();
        reject("Failed to refresh token");
      }
    });
  });
};

/**
 * Decodes the ID token and extracts user information
 */
export const decodeTokenAndStoreUser = (): User | null => {
  try {
    const token = getIdToken();

    if (!token) {
      Logger.error("ID token not found for user decoding.");
      useUserStore.getState().clearUser();
      return null;
    }

    const decoded = jwtDecode<TokenPayload>(token);

    const nameFromParts =
      `${decoded.given_name || ""} ${decoded.family_name || ""}`.trim();
    const user: User = {
      email: decoded.email || "",
      name: decoded.name || nameFromParts,
    };
    useUserStore.getState().setUser(user);
    return user;
  } catch (error) {
    bridgeLog(
      `decodeTokenAndStoreUser: failed - ${error}`,
      "error",
    );
    Logger.error("Failed to decode token and store user information", error);
    useUserStore.getState().clearUser();
    return null;
  }
};

/**
 * Initializes user data from stored token.
 * Should be called when the app starts.
 */
export const initializeUserFromToken = (): void => {
  useUserStore.getState().setLoading(true);

  try {
    decodeTokenAndStoreUser();
  } catch (error) {
    bridgeLog(`initializeUserFromToken: failed - ${error}`, "error");
    Logger.error("Failed to initialize user from token", error);
    useUserStore.getState().clearUser();
  } finally {
    useUserStore.getState().setLoading(false);
  }
};
