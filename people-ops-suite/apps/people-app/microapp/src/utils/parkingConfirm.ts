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

import type { NavigateFunction } from "react-router-dom";

import { serviceUrls } from "@/config/config";
import type { ParkingReservationDetails, WalletDetails } from "@/types";
import {
  clearParkingPaymentContextState,
  setConfirmationState,
} from "@/utils/parkingStorage";
import { executeWithTokenHandling, type RequestOptions } from "@/utils/http";

type HttpHandleRequest = (options: RequestOptions) => Promise<void>;
type HttpHandleRequestWithNewToken = (callback: () => void) => void;

export function fetchUserWallets(
  handleRequest: HttpHandleRequest,
  handleRequestWithNewToken: HttpHandleRequestWithNewToken,
): Promise<WalletDetails[]> {
  return new Promise<WalletDetails[]>((resolve, reject) => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingWallets(),
      "GET",
      null,
      (data) => resolve((data as WalletDetails[] | null) ?? []),
      (err) => reject(err ?? "Failed to load wallets"),
      () => {},
    );
  });
}

export function confirmParkingReservation(
  handleRequest: HttpHandleRequest,
  handleRequestWithNewToken: HttpHandleRequestWithNewToken,
  reservationId: number,
  fromAddress: string,
): Promise<ParkingReservationDetails> {
  const body = { reservationId, fromAddress };
  return new Promise<ParkingReservationDetails>((resolve, reject) => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.confirmParkingReservation(),
      "POST",
      body,
      (data) => resolve(data as ParkingReservationDetails),
      (err) => reject(err ?? "Failed to confirm reservation"),
      () => {},
    );
  });
}

export function fetchParkingReservationById(
  handleRequest: HttpHandleRequest,
  handleRequestWithNewToken: HttpHandleRequestWithNewToken,
  reservationId: number,
): Promise<ParkingReservationDetails> {
  return new Promise<ParkingReservationDetails>((resolve, reject) => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingReservationById(reservationId),
      "GET",
      null,
      (data) => resolve(data as ParkingReservationDetails),
      (err) => reject(err ?? "Failed to fetch reservation"),
      () => {},
    );
  });
}

/**
 * After a successful confirm API: persist the receipt, drop the payment
 * context, and navigate to the in-app confirmation screen.
 */
export function finalizeParkingConfirmationAfterSuccess(
  confirmed: ParkingReservationDetails,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
): void {
  setConfirmationState(confirmed);
  clearParkingPaymentContextState();
  navigate("/services/parking/confirmation", {
    replace: options?.replace ?? false,
    state: { reservationId: confirmed.id },
  });
}
