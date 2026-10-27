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

import type { DecimalLike, ParkingReservationDetails } from "@/types/parking";

export type ParkingPaymentContextState = {
  slotId: string;
  floorName: string;
  coinsAmount: DecimalLike;
  bookingDate: string; // YYYY-MM-DD
  reservationId?: number;
};

const PAYMENT_CONTEXT_KEY = "people_parking_payment_context";
const CONFIRMATION_KEY = "people_parking_confirmation";

export function setParkingPaymentContextState(
  state: ParkingPaymentContextState,
) {
  // Persist across WebView reloads.
  localStorage.setItem(PAYMENT_CONTEXT_KEY, JSON.stringify(state));
}

export function getParkingPaymentContextState():
  | ParkingPaymentContextState
  | undefined {
  const raw = localStorage.getItem(PAYMENT_CONTEXT_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ParkingPaymentContextState;
  } catch {
    return undefined;
  }
}

export function clearParkingPaymentContextState() {
  localStorage.removeItem(PAYMENT_CONTEXT_KEY);
}

export function setConfirmationState(reservation: ParkingReservationDetails) {
  // Persist across WebView reloads so confirmation screen can render.
  localStorage.setItem(CONFIRMATION_KEY, JSON.stringify(reservation));
}

export function getConfirmationState():
  | ParkingReservationDetails
  | undefined {
  const raw = localStorage.getItem(CONFIRMATION_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ParkingReservationDetails;
  } catch {
    return undefined;
  }
}

export function clearConfirmationState() {
  localStorage.removeItem(CONFIRMATION_KEY);
}

