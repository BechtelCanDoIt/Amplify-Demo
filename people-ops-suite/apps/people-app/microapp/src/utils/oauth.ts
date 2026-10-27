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

let idToken: string | null = null;
let userName: string = "";
let userRoles: string[] = [];
let userPrivileges: string[] = [];

let accessToken: string | null = null;

let isLoggedOut: boolean = false;

export function setIsLoggedOut(status: boolean): void {
  isLoggedOut = status;
}

export function getIsLoggedOut(): boolean {
  return isLoggedOut;
}

export function setIdToken(token: string): void {
  idToken = token;
}

export function getIdToken(): string | null {
  return idToken;
}

export function setUserName(user: string): void {
  userName = user;
}

export function getUserName(): string {
  return userName;
}

export function setUserPrivileges(privileges: string[]): void {
  userPrivileges = privileges;
}

export function getUserPrivileges(): string[] {
  return userPrivileges;
}

export function setUserRoles(rolesFromJWT: string | string[]): void {
  if (typeof rolesFromJWT === "string") {
    userRoles = rolesFromJWT.split(",");
  } else if (Array.isArray(rolesFromJWT)) {
    userRoles = [...rolesFromJWT];
  }
}

export function getUserRoles(): string[] {
  return userRoles;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}
