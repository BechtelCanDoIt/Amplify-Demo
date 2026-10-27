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

const TIME_ZONE = "Asia/Colombo";

/**
 * Current hour (0–23) in Asia/Colombo.
 */
export function getColomboHour(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === "hour")?.value;
  return hourPart !== undefined ? parseInt(hourPart, 10) : 0;
}

/**
 * Reservations allowed when `startHour <= hour < endHour`.
 */
export function isWithinParkingReservationWindow(
  startHour: number,
  endHour: number,
): boolean {
  const hour = getColomboHour();
  return hour >= startHour && hour < endHour;
}

/** e.g. 5 → "5:00 AM", 14 → "2:00 PM" */
export function formatHour12WithMinutes(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

/**
 * Returns today's date in `YYYY-MM-DD` for Asia/Colombo timezone.
 * Backend validates that reservations are for same-day (Sri Lanka time).
 */
export function getTodayBookingDate(): string {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // en-CA => YYYY-MM-DD
  return dtf.format(now);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Formats a `YYYY-MM-DD` booking date into `Mon DD, YYYY`.
 */
export function formatBookingDate(dateYYYYMMDD: string): string {
  const [y, m, d] = dateYYYYMMDD.split("-").map((v) => Number(v));
  const parsed = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return parsed.toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

