// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import axios from "axios";
import { config } from "../config";
import { getChoreoUserToken } from "../auth/choreo";
import { VehicleStatus, VehicleType } from "../types";
import { backendErrorMessage, logBackendError } from "../utils/log";

// The Choreo token is sent as Authorization: Bearer. Choreo API Gateway validates
// it and injects it as x-jwt-assertion to the Ballerina backend, which enforces
// self-only access by comparing the JWT email to the {employeeEmail} path segment.
async function bearerHeaders(googleUserId: string, idToken: string) {
  const choreoToken = await getChoreoUserToken(googleUserId, idToken);
  return {
    Authorization: `Bearer ${choreoToken}`,
    "Content-Type": "application/json",
    "User-Agent": "wso2-digital-agent/1.0",
  };
}

export async function addVehicle(
  googleUserId: string,
  idToken: string,
  wso2Email: string,
  vehicleRegistrationNumber: string,
  vehicleType: VehicleType
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.peopleBackendUrl}/employees/${encodeURIComponent(wso2Email)}/vehicles`,
      { vehicleRegistrationNumber, vehicleType },
      { headers }
    );
    return {
      success: true,
      message: "Vehicle added successfully.",
      data: response.data,
    };
  } catch (err: any) {
    logBackendError("[vehicle]", "addVehicle", err);
    return { success: false, message: `Failed to add vehicle: ${backendErrorMessage(err)}` };
  }
}

export async function getVehicles(
  googleUserId: string,
  idToken: string,
  wso2Email: string,
  vehicleStatus?: VehicleStatus,
  vehicleType?: VehicleType,
  offset?: number,
  limit?: number
): Promise<{ success: boolean; vehicles?: object[]; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const params: Record<string, string | number> = {};
    if (vehicleStatus) params.vehicleStatus = vehicleStatus;
    if (vehicleType) params.vehicleType = vehicleType;
    if (offset !== undefined) params.offset = offset;
    if (limit !== undefined) params.limit = limit;
    const response = await axios.get(
      `${config.services.peopleBackendUrl}/employees/${encodeURIComponent(wso2Email)}/vehicles`,
      { params, headers }
    );
    // Backend returns either an array directly or { vehicles: [...] }; tolerate both.
    const data = response.data;
    const vehicles: object[] = Array.isArray(data) ? data : (data?.vehicles ?? []);
    return { success: true, vehicles };
  } catch (err: any) {
    logBackendError("[vehicle]", "getVehicles", err);
    return { success: false, message: `Failed to fetch vehicles: ${backendErrorMessage(err)}` };
  }
}

export async function deleteVehicle(
  googleUserId: string,
  idToken: string,
  wso2Email: string,
  vehicleId: number
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.delete(
      `${config.services.peopleBackendUrl}/employees/${encodeURIComponent(wso2Email)}/vehicles/${vehicleId}`,
      { headers }
    );
    return { success: true, message: "Vehicle deleted successfully.", data: response.data };
  } catch (err: any) {
    logBackendError("[vehicle]", "deleteVehicle", err);
    return { success: false, message: `Failed to delete vehicle: ${backendErrorMessage(err)}` };
  }
}
