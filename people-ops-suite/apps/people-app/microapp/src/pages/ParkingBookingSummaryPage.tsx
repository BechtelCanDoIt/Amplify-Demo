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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AccountBalanceWalletSharp,
  ArrowForwardSharp,
  ArrowRightAltSharp,
  CalendarMonthSharp,
  DirectionsCarSharp,
  KeyboardBackspaceSharp,
  WarningAmberSharp,
} from "@mui/icons-material";
import { CircularProgress, IconButton, MenuItem, Select } from "@mui/material";

import { PageTransitionWrapper } from "@/components/shared";
import useHttp, { executeWithTokenHandling, getEmailAsync } from "@/utils/http";
import { serviceUrls } from "@/config/config";
import type {
  CreateParkingReservationResponse,
  VehicleResponse,
  WalletDetails,
} from "@/types";
import { getTodayBookingDate, formatBookingDate } from "@/utils/helpers/date";
import { formatCoins, toNumber } from "@/utils/helpers/coins";
import { truncateAddress } from "@/utils/helpers/address";
import {
  getParkingPaymentContextState,
  setParkingPaymentContextState,
  clearParkingPaymentContextState,
} from "@/utils/parkingStorage";
import {
  confirmParkingReservation,
  fetchParkingReservationById,
  fetchUserWallets,
  finalizeParkingConfirmationAfterSuccess,
} from "@/utils/parkingConfirm";
import { Logger } from "@/utils/logger";

type VehicleOption = {
  vehicleId: number;
  vehicleRegistrationNumber: string;
};

const PARKING_PAYEE_LABEL = "Car Park";
const INSUFFICIENT_BALANCE_HINT = "Insufficient balance for this booking.";

function ParkingBookingSummaryPage() {
  const navigate = useNavigate();
  const { handleRequest, handleRequestWithNewToken } = useHttp();

  const paymentContext = getParkingPaymentContextState();
  const todayBookingDate = getTodayBookingDate();
  const hasPaymentContext = Boolean(paymentContext);

  const bookingDate = paymentContext?.bookingDate ?? todayBookingDate;
  const expectedCoins = paymentContext?.coinsAmount ?? 0;

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState<number | undefined>(undefined);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [vehiclesSetupRequired, setVehiclesSetupRequired] = useState(false);

  const [wallets, setWallets] = useState<WalletDetails[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(
    undefined,
  );
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [walletsUnavailable, setWalletsUnavailable] = useState(false);

  const [busyConfirm, setBusyConfirm] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showPaymentFailureModal, setShowPaymentFailureModal] = useState(false);

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.walletAddress === walletAddress),
    [wallets, walletAddress],
  );

  const insufficientBalance = useMemo(() => {
    if (!selectedWallet) return false;
    return toNumber(selectedWallet.balance) < toNumber(expectedCoins);
  }, [selectedWallet, expectedCoins]);

  useEffect(() => {
    if (!hasPaymentContext) return;

    let cancelled = false;

    const loadVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const email = await getEmailAsync();
        if (cancelled) return;

        executeWithTokenHandling(
          handleRequest,
          handleRequestWithNewToken,
          serviceUrls.fetchVehicles(email),
          "GET",
          null,
          (data) => {
            if (cancelled) return;
            const res = data as { vehicles?: VehicleResponse[] | null };
            const rawVehicles = res?.vehicles ?? null;

            // Backend can return `null` when the user hasn't registered vehicles.
            if (!rawVehicles || rawVehicles.length === 0) {
              setVehicles([]);
              setVehicleId(undefined);
              setVehiclesSetupRequired(true);
              setLoadingVehicles(false);
              return;
            }

            const options: VehicleOption[] = rawVehicles
              .filter((v) => String(v.vehicleType) === "CAR")
              .map((v) => ({
                vehicleId: v.vehicleId as number,
                vehicleRegistrationNumber: String(v.vehicleRegistrationNumber),
              }));

            setVehicles(options);
            setVehicleId(options[0]?.vehicleId);
            setVehiclesSetupRequired(options.length === 0);
            setLoadingVehicles(false);
          },
          (err) => {
            if (cancelled) return;
            setError(String(err ?? "Failed to load vehicles"));
            setVehicles([]);
            setVehicleId(undefined);
            setVehiclesSetupRequired(true);
            setLoadingVehicles(false);
          },
          () => {},
        );
      } catch (e) {
        if (cancelled) return;
        setError(String(e ?? "Failed to load vehicles"));
        setVehicles([]);
        setVehicleId(undefined);
        setVehiclesSetupRequired(true);
        setLoadingVehicles(false);
      }
    };

    const loadWallets = async () => {
      setLoadingWallets(true);
      try {
        const list = await fetchUserWallets(
          handleRequest,
          handleRequestWithNewToken,
        );
        if (cancelled) return;

        setWallets(list);
        setWalletsUnavailable(list.length === 0);
        const preferred =
          list.find((w) => w.defaultWallet) ?? list[0] ?? undefined;
        setWalletAddress(preferred?.walletAddress);
      } catch (e) {
        if (cancelled) return;
        Logger.error("Failed to load wallets", e);
        setWallets([]);
        setWalletsUnavailable(true);
        setWalletAddress(undefined);
      } finally {
        if (!cancelled) setLoadingWallets(false);
      }
    };

    void loadVehicles();
    void loadWallets();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPaymentContext]);

  const createReservation = () => {
    if (!paymentContext || !vehicleId)
      return Promise.reject("Vehicle not selected");

    const body = {
      slotId: paymentContext.slotId,
      bookingDate,
      vehicleId,
    };

    return new Promise<CreateParkingReservationResponse>((resolve, reject) => {
      executeWithTokenHandling(
        handleRequest,
        handleRequestWithNewToken,
        serviceUrls.createParkingReservation(),
        "POST",
        body,
        (data) => resolve(data as CreateParkingReservationResponse),
        (err) => reject(err ?? "Failed to create reservation"),
        () => {},
      );
    });
  };

  const handleConfirmAndPay = async () => {
    if (!paymentContext || !vehicleId || !selectedWallet) return;
    if (busyConfirm || insufficientBalance) return;

    setBusyConfirm(true);
    setError(undefined);
    setShowPaymentFailureModal(false);

    let reservationId = paymentContext.reservationId;

    try {
      // Recovery path: if a reservation was already created on a previous
      // attempt, reuse it rather than creating a second one. A payment is
      // idempotent on its reference, so re-confirming a still-pending
      // reservation cannot charge twice.
      if (reservationId) {
        const existing = await fetchParkingReservationById(
          handleRequest,
          handleRequestWithNewToken,
          reservationId,
        );

        if (existing.status === "CONFIRMED") {
          finalizeParkingConfirmationAfterSuccess(existing, navigate);
          return;
        }
        if (existing.status !== "PENDING") {
          // Stale reservation (e.g. EXPIRED); create a fresh one below.
          reservationId = undefined;
        }
      }

      if (!reservationId) {
        const reservation = await createReservation();
        reservationId = reservation.reservationId;

        setParkingPaymentContextState({
          ...paymentContext,
          reservationId,
          coinsAmount: reservation.coinsAmount,
        });
      }

      const confirmed = await confirmParkingReservation(
        handleRequest,
        handleRequestWithNewToken,
        reservationId,
        selectedWallet.walletAddress,
      );

      finalizeParkingConfirmationAfterSuccess(confirmed, navigate);
    } catch (e) {
      // A confirm response can be lost mid-flight after the payment succeeded.
      // Verify server state before declaring failure so a booking that went
      // through never shows a false error.
      const rid =
        getParkingPaymentContextState()?.reservationId ?? reservationId;
      if (rid) {
        try {
          const existing = await fetchParkingReservationById(
            handleRequest,
            handleRequestWithNewToken,
            rid,
          );
          if (existing.status === "CONFIRMED") {
            finalizeParkingConfirmationAfterSuccess(existing, navigate);
            return;
          }
        } catch (verifyErr) {
          Logger.error("Parking confirm recovery check failed", verifyErr);
        }
      }

      const msg = String(e ?? "Payment failed");
      setError(msg);
      setShowPaymentFailureModal(true);
      Logger.error("Parking confirm error:", e);
    } finally {
      setBusyConfirm(false);
    }
  };

  if (!paymentContext) {
    return (
      <PageTransitionWrapper type="secondary">
        <div className="h-screen bg-white grid place-items-center px-6">
          <div className="text-center">
            <div className="text-[#1F2A44] font-semibold text-lg mb-2">
              Payment details not found
            </div>
            <div className="text-[#808080] font-medium mb-6">
              Please go back and start again.
            </div>
            <button
              type="button"
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold"
              onClick={() => navigate("/services/parking")}
            >
              Back to slot selection
            </button>
          </div>
        </div>
      </PageTransitionWrapper>
    );
  }

  const confirmDisabled =
    busyConfirm ||
    !vehicleId ||
    vehiclesSetupRequired ||
    !selectedWallet ||
    insufficientBalance;

  const topContent = (
    <section className="px-4 mt-2 pb-4">
      <div className="bg-white border border-[#E5E5E5] rounded-[1.2rem] px-4 pt-5 pb-6 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-[1rem] bg-[#FFE1C9] grid place-items-center">
            <div
              className="w-10 h-10 rounded-full border-2 border-[#ff7300] grid place-items-center"
              style={{ borderColor: "#ff7300", color: "#ff7300" }}
            >
              <span className="font-extrabold text-2xl">P</span>
            </div>
          </div>

          <div className="text-[12.5px] mt-3 font-semibold text-[#808080] tracking-widest">
            PARKING SLOT
          </div>
          <div className="text-[34px] font-extrabold text-[#1F2A44] leading-none mt-1">
            {paymentContext.slotId}
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-[#F4F4F4] text-[13px] font-semibold text-[#1F2A44]">
            {paymentContext.floorName}
          </div>
        </div>

        <div className="mt-6 border-t border-dashed border-[#E5E5E5] pt-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAF3FF] grid place-items-center">
              <DirectionsCarSharp style={{ color: "#0B64C0" }} />
            </div>
            <div className="text-[13px] font-bold text-[#808080]">
              Select Vehicle
            </div>
          </div>

          <div className="mt-3">
            {loadingVehicles ? (
              <div className="grid place-items-center py-6">
                <CircularProgress size={26} sx={{ color: "#ff7300" }} />
              </div>
            ) : vehiclesSetupRequired ? (
              <div className="py-3">
                <div className="text-sm font-medium text-[#808080]">
                  Add a vehicle to confirm your booking.
                </div>
                <button
                  type="button"
                  className="mt-3 w-full p-[0.75rem] text-[14px] font-semibold rounded-[0.7rem] border border-[#E5E5E5] bg-white text-[#1F2A44]"
                  onClick={() => navigate("/services/vehicles")}
                >
                  Manage Personal Vehicles
                </button>
              </div>
            ) : (
              <Select
                value={vehicleId ?? ""}
                onChange={(e) => setVehicleId(Number(e.target.value))}
                displayEmpty
                fullWidth
                sx={{
                  fontWeight: 700,
                  backgroundColor: "#F4F4F4",
                  borderRadius: "12px",
                  height: 48,
                }}
              >
                <MenuItem value="" disabled>
                  Select a vehicle
                </MenuItem>
                {vehicles.map((v) => (
                  <MenuItem key={v.vehicleId} value={v.vehicleId}>
                    {v.vehicleRegistrationNumber}
                  </MenuItem>
                ))}
              </Select>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-dashed border-[#E5E5E5] pt-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAF3FF] grid place-items-center">
              <AccountBalanceWalletSharp style={{ color: "#0B64C0" }} />
            </div>
            <div className="text-[13px] font-bold text-[#808080]">Pay From</div>
          </div>

          <div className="mt-3">
            {loadingWallets ? (
              <div className="grid place-items-center py-6">
                <CircularProgress size={26} sx={{ color: "#ff7300" }} />
              </div>
            ) : walletsUnavailable ? (
              <div className="text-sm font-medium text-[#808080] py-3">
                No wallet is available for payment right now. Please try again
                later.
              </div>
            ) : (
              <>
                <Select
                  value={walletAddress ?? ""}
                  onChange={(e) => setWalletAddress(String(e.target.value))}
                  displayEmpty
                  fullWidth
                  sx={{
                    fontWeight: 700,
                    backgroundColor: "#F4F4F4",
                    borderRadius: "12px",
                    height: 48,
                  }}
                >
                  <MenuItem value="" disabled>
                    Select a wallet
                  </MenuItem>
                  {wallets.map((w) => (
                    <MenuItem key={w.walletAddress} value={w.walletAddress}>
                      <span className="flex items-center justify-between w-full gap-3">
                        <span className="font-bold text-[#1F2A44]">
                          {truncateAddress(w.walletAddress)}
                          {w.defaultWallet ? " · Default" : ""}
                        </span>
                        <span className="text-[#808080] font-semibold">
                          {formatCoins(w.balance)} O2C
                        </span>
                      </span>
                    </MenuItem>
                  ))}
                </Select>

                {selectedWallet && (
                  <div className="mt-3 flex items-center justify-between rounded-[0.9rem] bg-[#F8FAFC] border border-[#EEF1F5] px-3 py-2">
                    <div className="text-left">
                      <div className="text-[11px] font-bold text-[#808080] tracking-wider">
                        FROM
                      </div>
                      <div className="text-[14px] font-extrabold text-[#1F2A44]">
                        {truncateAddress(selectedWallet.walletAddress)}
                      </div>
                    </div>
                    <ArrowRightAltSharp style={{ color: "#9CA3AF" }} />
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-[#808080] tracking-wider">
                        TO
                      </div>
                      <div className="text-[14px] font-extrabold text-[#1F2A44]">
                        {PARKING_PAYEE_LABEL}
                      </div>
                    </div>
                  </div>
                )}

                {insufficientBalance && (
                  <div className="mt-2 text-[12.8px] font-semibold text-[#C0392B]">
                    {INSUFFICIENT_BALANCE_HINT}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-[#E5E5E5] pt-5">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-[#EAF3FF] grid place-items-center">
              <CalendarMonthSharp style={{ color: "#0B64C0" }} />
            </div>
            <div className="text-[13px] font-bold text-[#808080]">Date</div>
          </div>

          <div className="mt-2 inline-block ml-[8px] text-left text-[16px] font-bold text-[#1F2A44] leading-none">
            {formatBookingDate(bookingDate)}
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-[#E5E5E5] pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[#808080]">
              Amount to Pay
            </div>
            <div className="text-[26px] font-extrabold text-[#ff7300]">
              {formatCoins(expectedCoins)}{" "}
              <span className="text-[#1F2A44] text-[18px]">O2C</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-start gap-2 bg-[#FFF2F2] border border-[#FFD9D9] rounded-lg px-3 py-2">
            <WarningAmberSharp style={{ color: "#FF4D4D", marginTop: 2 }} />
            <div className="text-[12.8px] font-medium text-[#7A1F1F]">
              This booking is non-refundable once payment is confirmed.
            </div>
          </div>
        </div>

        {showPaymentFailureModal && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-20 grid place-items-center px-5">
            <div className="w-full max-w-[360px] bg-white border border-red-200 rounded-[1.2rem] p-4">
              <div className="text-[#1F2A44] font-extrabold text-[16px]">
                Payment Unsuccessful
              </div>
              <div className="text-[#808080] text-sm mt-2">
                <div className="px-2 py-1">{error ?? "Please try again."}</div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="flex-1 py-[0.7rem] px-3 text-[15px] font-semibold rounded-[0.7rem] bg-primary text-white disabled:bg-[#F4F4F4] disabled:text-[#A7A7A7]"
                  disabled={confirmDisabled}
                  onClick={() => {
                    setShowPaymentFailureModal(false);
                    setError(undefined);
                    void handleConfirmAndPay();
                  }}
                >
                  Retry
                </button>

                <button
                  type="button"
                  className="flex-1 py-[0.7rem] px-3 text-[15px] font-semibold rounded-[0.7rem] border border-[#E5E5E5] bg-white text-[#1F2A44]"
                  onClick={() => {
                    setShowPaymentFailureModal(false);
                    setError(undefined);
                    clearParkingPaymentContextState();
                    navigate("/services/parking");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            className="w-full p-[0.9rem] text-lg font-semibold rounded-[0.7rem] bg-primary text-white disabled:bg-[#F4F4F4] disabled:text-[#A7A7A7]"
            disabled={confirmDisabled}
            onClick={handleConfirmAndPay}
          >
            <span className="flex items-center justify-center gap-2">
              {busyConfirm ? "Confirming..." : "Confirm & Pay"}
              <ArrowForwardSharp className="text-white" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );

  return (
    <PageTransitionWrapper type="secondary">
      <div className="h-screen bg-white relative overflow-y-auto pb-12">
        <section className="px-4 pt-[calc(var(--safe-top)+12px)]">
          <div className="flex items-center justify-between">
            <IconButton
              onClick={() => navigate("/services/parking")}
              aria-label="Back to slot selection"
            >
              <KeyboardBackspaceSharp className="text-black" />
            </IconButton>
            <h1 className="text-[18px] font-semibold text-[#1F2A44]">
              Booking Summary
            </h1>
            <div className="w-[40px]" />
          </div>
        </section>

        {topContent}

        {busyConfirm && (
          <div className="absolute inset-0 bg-white/70 grid place-items-center">
            <CircularProgress size={34} sx={{ color: "#ff7300" }} />
          </div>
        )}

        <div className="px-4 text-[12.5px] font-medium text-[#808080] mt-1 text-center">
          Payment will be deducted from your selected wallet.
        </div>
      </div>
    </PageTransitionWrapper>
  );
}

export default ParkingBookingSummaryPage;
