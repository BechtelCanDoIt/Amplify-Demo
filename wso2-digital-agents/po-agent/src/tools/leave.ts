// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import axios from "axios";
import { config } from "../config";
import { getChoreoUserToken } from "../auth/choreo";
import { LeavePayload } from "../types";
import { backendErrorMessage, logBackendError } from "../utils/log";

// The Choreo token is sent as Authorization: Bearer.
// Choreo API Gateway validates it and injects it as x-jwt-assertion to the
// Ballerina backend, which extracts email + groups from the JWT claims.

async function bearerHeaders(googleUserId: string, idToken: string) {
  const choreoToken = await getChoreoUserToken(googleUserId, idToken);
  return {
    Authorization: `Bearer ${choreoToken}`,
    "Content-Type": "application/json",
    "User-Agent": "wso2-digital-agent/1.0",
  };
}

export async function submitLeave(
  googleUserId: string,
  idToken: string,
  payload: LeavePayload
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.leaveBackendUrl}/leaves`,
      payload,
      { headers }
    );
    return {
      success: true,
      message: "Leave submitted successfully.",
      data: response.data,
    };
  } catch (err: any) {
    logBackendError("[leave]", "submitLeave", err);
    return { success: false, message: `Failed to submit leave: ${backendErrorMessage(err)}` };
  }
}

export async function checkLeaveDates(
  googleUserId: string,
  idToken: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; holidays?: { title: string; date: string }[]; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.get(
      `${config.services.leaveBackendUrl}/user-calendar`,
      { params: { startDate, endDate }, headers }
    );
    return { success: true, holidays: response.data.holidays ?? [] };
  } catch (err: any) {
    const detail = err.response?.data?.message || err.message || "Unknown error";
    return { success: false, message: `Failed to check holidays: ${detail}` };
  }
}

export async function getLeaveHistory(
  googleUserId: string,
  idToken: string,
  wso2Email: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; leaves?: object[]; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const params = new URLSearchParams([
      ["email", wso2Email],
      ["statuses", "PENDING"],
      ["statuses", "APPROVED"],
      ["statuses", "CANCELLED"],
      ["orderBy", "DESC"],
      ["limit", "20"],
    ]);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const response = await axios.get(
      `${config.services.leaveBackendUrl}/leaves`,
      { params, headers }
    );
    return { success: true, leaves: response.data.leaves ?? [] };
  } catch (err: any) {
    const detail = err.response?.data?.message || err.message || "Unknown error";
    return { success: false, message: `Failed to fetch leave history: ${detail}` };
  }
}

export async function getPendingLeaves(
  googleUserId: string,
  idToken: string,
  wso2Email: string
): Promise<{ success: boolean; leaves?: object[]; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.get(
      `${config.services.leaveBackendUrl}/leaves`,
      {
        params: new URLSearchParams([
          ["email", wso2Email],
          ["statuses", "PENDING"],
          ["statuses", "APPROVED"],
        ]),
        headers,
      }
    );
    return { success: true, leaves: response.data.leaves ?? [] };
  } catch (err: any) {
    const detail = err.response?.data?.message || err.message || "Unknown error";
    return { success: false, message: `Failed to fetch leaves: ${detail}` };
  }
}

export async function cancelLeave(
  googleUserId: string,
  idToken: string,
  leaveId: number
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.delete(
      `${config.services.leaveBackendUrl}/leaves/${leaveId}`,
      { headers }
    );
    return { success: true, message: "Leave cancelled successfully.", data: response.data };
  } catch (err: any) {
    logBackendError("[leave]", "cancelLeave", err);
    return { success: false, message: `Failed to cancel leave: ${backendErrorMessage(err)}` };
  }
}
