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

export type DecimalLike = number | string;

export interface CarParkConfigResponse {
  reservationWindowStartHour: number;
  reservationWindowEndHour: number;
}

export interface WalletDetails {
  walletAddress: string;
  balance: DecimalLike;
  defaultWallet: boolean;
}

export interface ParkingFloor {
  id: number;
  name: string;
  displayOrder: number;
  coinsPerSlot: DecimalLike;
}

export interface ParkingSlot {
  slotId: string;
  floorId: number;
  floorName: string;
  coinsPerSlot: DecimalLike;
  isBooked: boolean;
}

export interface CreateParkingReservationResponse {
  reservationId: number;
  coinsAmount: DecimalLike;
}

export type ParkingReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "EXPIRED"
  | "DUPLICATE";

export interface ParkingReservationDetails {
  id: number;
  slotId: string;
  bookingDate: string;
  employeeEmail: string;
  vehicleId: number;
  vehicleRegistrationNumber: string;
  vehicleType: string | null;
  status: ParkingReservationStatus | string;
  paymentReference: string | null;
  coinsAmount: DecimalLike;
  floorName: string;
  createdOn: string;
  createdBy: string;
  updatedOn: string;
  updatedBy: string;
}

export interface ConfirmParkingReservationRequest {
  reservationId: number;
  fromAddress: string;
}

export interface CreateParkingReservationRequest {
  slotId: string;
  bookingDate: string;
  vehicleId: number;
}

