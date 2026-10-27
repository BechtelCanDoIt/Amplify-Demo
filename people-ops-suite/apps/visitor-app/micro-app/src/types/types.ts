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

// Floor and room structure
export interface FloorRoom {
  floor: string;
  rooms: string[];
}

// Visitor types
export interface AddVisitorPayload {
  firstName?: string;
  lastName?: string;
  idHash: string;
  contactNumber?: string;
  email?: string;
}

export interface Visitor extends AddVisitorPayload {
  createdBy: string;
  createdOn: string;
  updatedBy: string;
  updatedOn: string;
}

// Visit types
export interface AddVisitPayload {
  companyName?: string;
  passNumber?: string;
  whomTheyMeet?: string;
  purposeOfVisit?: string;
  accessibleLocations?: FloorRoom[] | null;
  timeOfEntry?: string;
  timeOfDeparture?: string;
  visitorIdHash: string;
  visitDate: string;
  uuid: string;
  qrCode?: number[];
}

export interface Visit {
  id: number;
  firstName: string | null;
  lastName: string | null;
  visitDate: string;
  contactNumber: string | null;
  email: string;
  emailHash: string;
  companyName: string | null;
  passNumber: string | null;
  whomTheyMeet: string | null;
  purposeOfVisit: string | null;
  accessibleLocations: FloorRoom[] | null;
  timeOfEntry: string | null;
  timeOfDeparture: string | null;
  status: string;
  createdBy: string;
  createdOn: string;
  updatedBy: string;
  updatedOn: string;
  invitationId: number | null;
}

export interface FetchVisitsResponse {
  totalCount: number;
  visits: Visit[];
}

// Employee types
export interface Employee {
  firstName: string;
  lastName: string;
  workEmail: string;
  employeeThumbnail: string | null;
}

// Building resource types
export interface BuildingResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceEmail: string;
  resourceCategory: string;
  floorName?: string;
  buildingId?: string;
  description?: string;
}

// User info
export interface UserInfo {
  employeeId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  employeeThumbnail: string | null;
  jobRole: string;
  privileges: number[];
}

// Visitor status enum
export enum VisitorStatus {
  Draft = "Draft",
  Existing = "Existing",
  Completed = "Completed",
}

// Visitor detail in form
export interface VisitorDetail {
  name?: string;
  contactNumber: string | undefined;
  countryCode: string;
  emailAddress: string | undefined;
  status: VisitorStatus;
}
