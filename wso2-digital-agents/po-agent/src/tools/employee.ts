// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import axios from "axios";
import { config } from "../config";
import { getChoreoUserToken } from "../auth/choreo";
import { backendErrorMessage, logBackendError } from "../utils/log";

// The exact string used in the HR system's workLocation field for Sri Lanka.
// VERIFY this matches your `hris_employee.work_location` data before deploying.
// Comparison is trim+lowercase, so minor formatting differences are tolerated.
const SRI_LANKA_LOCATION = "Sri Lanka";

export function isSriLankaLocation(loc?: string | null): boolean {
  return !!loc && loc.trim().toLowerCase() === SRI_LANKA_LOCATION.toLowerCase();
}

// The Choreo token is sent as Authorization: Bearer. Choreo API Gateway validates
// it and injects it as x-jwt-assertion to the Ballerina backend, which resolves
// identity from the JWT — every "me" call is implicitly scoped to the caller.
async function bearerHeaders(googleUserId: string, idToken: string) {
  const choreoToken = await getChoreoUserToken(googleUserId, idToken);
  return {
    Authorization: `Bearer ${choreoToken}`,
    "Content-Type": "application/json",
    "User-Agent": "wso2-digital-agent/1.0",
  };
}

// Two-call flow:
//   1. GET /user-info — returns the authenticated user's EmployeeBasicInfo (carries employeeId).
//   2. GET /employees/{employeeId} — returns the full Employee record including workLocation.
// The second call's self-check passes because the backend compares the returned
// employeeInfo.workEmail to userInfo.email. No cross-user surface — only the
// authenticated caller's own data is reachable.
export async function getMyLocation(
  googleUserId: string,
  idToken: string
): Promise<{ success: boolean; location?: string; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);

    const userInfoResp = await axios.get(
      `${config.services.peopleBackendUrl}/user-info`,
      { headers }
    );
    const employeeId: string | undefined = userInfoResp.data?.employeeId;
    if (!employeeId) {
      return { success: false, message: "Could not resolve your employee ID from the HR system." };
    }

    const employeeResp = await axios.get(
      `${config.services.peopleBackendUrl}/employees/${encodeURIComponent(employeeId)}`,
      { headers }
    );
    const workLocation: string | undefined = employeeResp.data?.workLocation;
    if (!workLocation) {
      return { success: false, message: "Your employee record does not have a work location set." };
    }

    return { success: true, location: workLocation };
  } catch (err: any) {
    logBackendError("[employee]", "getMyLocation", err);
    return { success: false, message: `Failed to fetch your location: ${backendErrorMessage(err)}` };
  }
}
