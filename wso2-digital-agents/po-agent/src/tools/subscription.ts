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

// The Choreo token is sent as Authorization: Bearer. Choreo API Gateway validates
// it and injects it as x-jwt-assertion to the Ballerina backend, which enforces
// self-only access by comparing the JWT email to the {email} path segment.
async function bearerHeaders(googleUserId: string, idToken: string) {
  const choreoToken = await getChoreoUserToken(googleUserId, idToken);
  return {
    Authorization: `Bearer ${choreoToken}`,
    "Content-Type": "application/json",
    "User-Agent": "wso2-digital-agent/1.0",
  };
}

interface CommuteDistanceRange {
  id: number;
  minKm: number;
  maxKm: number;
  monthlyRate: number;
}

interface SubscriptionMetaInfo {
  distances: CommuteDistanceRange[];
  optInStartDay: number;
  optInEndDay: number;
  optOutStartDay: number;
  optOutEndDay: number;
}

// Not exposed as an LLM tool. Used internally to (a) resolve a commute
// distanceRangeId from a user-provided km value and (b) translate the
// backend's day-of-month opt-in/opt-out window into real calendar dates for
// error messages. The same window applies to both the meal and commute
// services (see subscription-app-backend/service.bal).
async function fetchSubscriptionMeta(
  googleUserId: string,
  idToken: string
): Promise<SubscriptionMetaInfo> {
  const headers = await bearerHeaders(googleUserId, idToken);
  const response = await axios.get(
    `${config.services.subscriptionBackendUrl}/subscriptions/meta-info`,
    { headers }
  );
  return {
    distances: response.data?.distances ?? [],
    optInStartDay: response.data?.optInStartDay,
    optInEndDay: response.data?.optInEndDay,
    optOutStartDay: response.data?.optOutStartDay,
    optOutEndDay: response.data?.optOutEndDay,
  };
}

function isDateWindowError(err: any): boolean {
  return err?.response?.status === 400 && /date is not between/i.test(backendErrorMessage(err));
}

// The window is expressed as day-of-month bounds only (e.g. 25 to 5), so it
// can wrap across a month boundary. Resolves it to the concrete upcoming
// calendar dates relative to today, e.g. "July 25 to August 5".
function formatDateWindow(startDay: number, endDay: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  let start: Date;
  let end: Date;
  if (startDay <= endDay) {
    // Window falls within a single month. If today is already past it,
    // the next occurrence is next month; otherwise it's later this month.
    const targetMonth = today > endDay ? month + 1 : month;
    start = new Date(year, targetMonth, startDay);
    end = new Date(year, targetMonth, endDay);
  } else {
    // Wraps across the month boundary (e.g. 25th to 5th of next month).
    // A rejected request always falls in the gap after endDay and before
    // startDay, so the upcoming window starts this month and ends next month.
    start = new Date(year, month, startDay);
    end = new Date(year, month + 1, endDay);
  }

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${fmt(start)} to ${fmt(end)}`;
}

// Builds a friendly, date-accurate message for a date-window rejection by
// fetching the current window from the backend. Falls back to the raw
// backend error message if the meta lookup itself fails.
async function dateWindowMessage(
  googleUserId: string,
  idToken: string,
  err: any,
  action: string,
  windowKind: "optIn" | "optOut",
  preFetchedMeta?: SubscriptionMetaInfo
): Promise<string> {
  try {
    const meta = preFetchedMeta ?? (await fetchSubscriptionMeta(googleUserId, idToken));
    const [startDay, endDay] = windowKind === "optIn"
      ? [meta.optInStartDay, meta.optInEndDay]
      : [meta.optOutStartDay, meta.optOutEndDay];
    return `You can only ${action} between ${formatDateWindow(startDay, endDay)}.`;
  } catch (metaErr) {
    logBackendError("[subscription]", "dateWindowMessage:fetchSubscriptionMeta", metaErr);
    return `Failed to ${action}: ${backendErrorMessage(err)}`;
  }
}

export async function subscribeLunch(
  googleUserId: string,
  idToken: string,
  wso2Email: string
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.subscriptionBackendUrl}/meal/${encodeURIComponent(wso2Email)}/subscribe`,
      {},
      { headers }
    );
    return { success: true, message: "Subscribed to lunch successfully.", data: response.data };
  } catch (err: any) {
    logBackendError("[subscription]", "subscribeLunch", err);
    if (isDateWindowError(err)) {
      const message = await dateWindowMessage(googleUserId, idToken, err, "subscribe to lunch", "optIn");
      return { success: false, message };
    }
    return { success: false, message: `Failed to subscribe to lunch: ${backendErrorMessage(err)}` };
  }
}

export async function unsubscribeLunch(
  googleUserId: string,
  idToken: string,
  wso2Email: string
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.subscriptionBackendUrl}/meal/${encodeURIComponent(wso2Email)}/unsubscribe`,
      {},
      { headers }
    );
    return { success: true, message: "Unsubscribed from lunch successfully.", data: response.data };
  } catch (err: any) {
    logBackendError("[subscription]", "unsubscribeLunch", err);
    if (isDateWindowError(err)) {
      const message = await dateWindowMessage(googleUserId, idToken, err, "unsubscribe from lunch", "optOut");
      return { success: false, message };
    }
    return { success: false, message: `Failed to unsubscribe from lunch: ${backendErrorMessage(err)}` };
  }
}

export async function getLunchSubscription(
  googleUserId: string,
  idToken: string,
  wso2Email: string
): Promise<{ success: boolean; subscription?: object | null; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.get(
      `${config.services.subscriptionBackendUrl}/meal/${encodeURIComponent(wso2Email)}`,
      { headers }
    );
    return { success: true, subscription: response.data };
  } catch (err: any) {
    // No subscription record yet — not an error condition for this tool.
    if (err.response?.status === 404) {
      return { success: true, subscription: null };
    }
    logBackendError("[subscription]", "getLunchSubscription", err);
    return { success: false, message: `Failed to fetch lunch subscription status: ${backendErrorMessage(err)}` };
  }
}

export async function subscribeCommute(
  googleUserId: string,
  idToken: string,
  wso2Email: string,
  distanceKm: number,
  contactNumber: string
): Promise<{ success: boolean; message: string; data?: object }> {
  let meta: SubscriptionMetaInfo;
  try {
    meta = await fetchSubscriptionMeta(googleUserId, idToken);
  } catch (err: any) {
    logBackendError("[subscription]", "subscribeCommute:fetchSubscriptionMeta", err);
    return { success: false, message: `Failed to look up commute plan options: ${backendErrorMessage(err)}` };
  }

  const match = meta.distances.find((d) => distanceKm >= d.minKm && distanceKm <= d.maxKm);
  if (!match) {
    const ranges = meta.distances.map((d) => `${d.minKm}-${d.maxKm}km`).join(", ");
    return {
      success: false,
      message: `No commute plan covers a distance of ${distanceKm} km. Available ranges: ${ranges || "none configured"}.`,
    };
  }

  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.subscriptionBackendUrl}/commutes/${encodeURIComponent(wso2Email)}/subscribe`,
      { distanceRangeId: match.id, contactNumber },
      { headers }
    );
    return {
      success: true,
      message: `Subscribed to the commute service successfully (${match.minKm}-${match.maxKm} km plan, LKR ${match.monthlyRate}/month).`,
      data: response.data,
    };
  } catch (err: any) {
    logBackendError("[subscription]", "subscribeCommute", err);
    if (isDateWindowError(err)) {
      const message = await dateWindowMessage(googleUserId, idToken, err, "subscribe to the commute service", "optIn", meta);
      return { success: false, message };
    }
    return { success: false, message: `Failed to subscribe to the commute service: ${backendErrorMessage(err)}` };
  }
}

export async function unsubscribeCommute(
  googleUserId: string,
  idToken: string,
  wso2Email: string
): Promise<{ success: boolean; message: string; data?: object }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.post(
      `${config.services.subscriptionBackendUrl}/commutes/${encodeURIComponent(wso2Email)}/unsubscribe`,
      {},
      { headers }
    );
    return { success: true, message: "Unsubscribed from the commute service successfully.", data: response.data };
  } catch (err: any) {
    logBackendError("[subscription]", "unsubscribeCommute", err);
    if (isDateWindowError(err)) {
      const message = await dateWindowMessage(googleUserId, idToken, err, "unsubscribe from the commute service", "optOut");
      return { success: false, message };
    }
    return { success: false, message: `Failed to unsubscribe from the commute service: ${backendErrorMessage(err)}` };
  }
}

export async function getCommuteSubscription(
  googleUserId: string,
  idToken: string,
  wso2Email: string
): Promise<{ success: boolean; subscription?: object | null; message?: string }> {
  try {
    const headers = await bearerHeaders(googleUserId, idToken);
    const response = await axios.get(
      `${config.services.subscriptionBackendUrl}/commutes/${encodeURIComponent(wso2Email)}`,
      { headers }
    );
    return { success: true, subscription: response.data };
  } catch (err: any) {
    // No subscription record yet — not an error condition for this tool.
    if (err.response?.status === 404) {
      return { success: true, subscription: null };
    }
    logBackendError("[subscription]", "getCommuteSubscription", err);
    return { success: false, message: `Failed to fetch commute subscription status: ${backendErrorMessage(err)}` };
  }
}
