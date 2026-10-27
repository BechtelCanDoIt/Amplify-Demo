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
  AccessTimeSharp,
  KeyboardBackspaceSharp,
  WarningAmberSharp,
} from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";

import { PageTransitionWrapper, BottomNav } from "@/components/shared";
import type {
  CarParkConfigResponse,
  ParkingFloor,
  ParkingReservationDetails,
  ParkingSlot,
  VehicleResponse,
} from "@/types";
import useHttp, { executeWithTokenHandling, getEmailAsync } from "@/utils/http";
import { serviceUrls } from "@/config/config";
import {
  formatHour12WithMinutes,
  getTodayBookingDate,
  isWithinParkingReservationWindow,
} from "@/utils/helpers/date";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { formatCoins } from "@/utils/helpers/coins";
import {
  clearParkingPaymentContextState,
  setParkingPaymentContextState,
} from "@/utils/parkingStorage";

function ParkingSlotSelectionPage() {
  const navigate = useNavigate();
  const todayBookingDate = getTodayBookingDate();

  const { handleRequest, handleRequestWithNewToken } = useHttp();

  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | undefined>(
    undefined,
  );
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | undefined>(
    undefined,
  );

  const [loadingFloors, setLoadingFloors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busyPayment, setBusyPayment] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesSetupRequired, setVehiclesSetupRequired] = useState(false);

  // Only one parking booking is allowed per employee per day. Holds the caller's
  // existing CONFIRMED reservation for today, if any. A PENDING booking is left to
  // the backend, which reuses a same-slot pending and expires stale ones, so a
  // stale abandoned pending never blocks re-booking here.
  const [existingBooking, setExistingBooking] =
    useState<ParkingReservationDetails | null>(null);
  const [checkingExistingBooking, setCheckingExistingBooking] = useState(true);

  const [reservationWindowStartHour, setReservationWindowStartHour] =
    useState(5);
  const [reservationWindowEndHour, setReservationWindowEndHour] = useState(7);
  const [reservationConfigLoaded, setReservationConfigLoaded] = useState(false);
  const [bookingWindowTick, setBookingWindowTick] = useState(0);

  const isBookingWindowActive = useMemo(() => {
    void bookingWindowTick;
    return isWithinParkingReservationWindow(
      reservationWindowStartHour,
      reservationWindowEndHour,
    );
  }, [
    bookingWindowTick,
    reservationWindowStartHour,
    reservationWindowEndHour,
  ]);

  const reservationWindowMessage = useMemo(
    () =>
      `Bookings must be made between ${formatHour12WithMinutes(reservationWindowStartHour)} and ${formatHour12WithMinutes(reservationWindowEndHour)} on the day of parking`,
    [reservationWindowStartHour, reservationWindowEndHour],
  );

  const fetchFloors = () => {
    setLoadingFloors(true);
    setError(undefined);
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingFloors(),
      "GET",
      null,
      (data) => {
        const nextFloors = data as ParkingFloor[];
        setFloors(nextFloors);
        setSelectedFloorId(nextFloors[0]?.id);
      },
      (err) => {
        setError(String(err ?? "Failed to load floors"));
      },
      (loading) => setLoadingFloors(loading),
    );
  };

  const fetchSlots = (floorId: number) => {
    setLoadingSlots(true);
    setError(undefined);
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingSlots(floorId, todayBookingDate),
      "GET",
      null,
      (data) => {
        setSlots(data as ParkingSlot[]);
        setSelectedSlot(undefined);
      },
      (err) => setError(String(err ?? "Failed to load slots")),
      (loading) => setLoadingSlots(loading),
    );
  };

  useEffect(() => {
    const bump = () => setBookingWindowTick((t) => t + 1);
    const id = window.setInterval(bump, 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchCarParkConfigs(),
      "GET",
      null,
      (data) => {
        const c = data as CarParkConfigResponse;
        if (typeof c.reservationWindowStartHour === "number") {
          setReservationWindowStartHour(c.reservationWindowStartHour);
        }
        if (typeof c.reservationWindowEndHour === "number") {
          setReservationWindowEndHour(c.reservationWindowEndHour);
        }
        setReservationConfigLoaded(true);
      },
      () => {
        // keep the default hours, but mark config resolved so the view-only
        // warning stays consistent with the (default-hours) booking window.
        setReservationConfigLoaded(true);
      },
      () => {
        /* no loading UI for config */
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isBookingWindowActive) {
      setSelectedSlot(undefined);
    }
  }, [isBookingWindowActive]);

  useEffect(() => {
    clearParkingPaymentContextState();
    fetchFloors();
    let cancelled = false;

    const initVehicles = async () => {
      try {
        setVehiclesLoading(true);
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
            const hasVehicles =
              Array.isArray(rawVehicles) && rawVehicles.length > 0;

            setVehiclesSetupRequired(!hasVehicles);
            setVehiclesLoading(false);
          },
          () => {
            if (cancelled) return;
            setVehiclesSetupRequired(true);
            setVehiclesLoading(false);
          },
          (loading) => {
            if (!cancelled) setVehiclesLoading(loading);
          },
        );
      } catch {
        if (cancelled) return;
        setVehiclesSetupRequired(true);
        setVehiclesLoading(false);
      }
    };

    void initVehicles();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedFloorId !== undefined) fetchSlots(selectedFloorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFloorId]);

  // Check upfront whether the caller already has a booking for today, so the
  // Proceed to Payment button can be disabled instead of failing at payment.
  useEffect(() => {
    let cancelled = false;
    setCheckingExistingBooking(true);
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingReservations(todayBookingDate, todayBookingDate),
      "GET",
      null,
      (data) => {
        if (cancelled) return;
        const list = (data as ParkingReservationDetails[]) ?? [];
        const active = list.find((r) => r.status === "CONFIRMED");
        setExistingBooking(active ?? null);
        setCheckingExistingBooking(false);
      },
      () => {
        // On failure don't block booking; the backend still guards duplicates.
        if (cancelled) return;
        setExistingBooking(null);
        setCheckingExistingBooking(false);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayBookingDate]);

  const handleProceedToPayment = () => {
    if (
      !isBookingWindowActive ||
      !selectedSlot ||
      busyPayment ||
      vehiclesLoading ||
      vehiclesSetupRequired ||
      checkingExistingBooking ||
      existingBooking
    ) {
      if (!vehiclesLoading && vehiclesSetupRequired) {
        navigate("/services/vehicles");
      }
      return;
    }
    setBusyPayment(true);
    setError(undefined);

    // Stage 1 UI step: persist chosen slot and navigate to summary.
    setParkingPaymentContextState({
      slotId: selectedSlot.slotId,
      floorName: selectedSlot.floorName,
      coinsAmount: selectedSlot.coinsPerSlot,
      bookingDate: todayBookingDate,
    });

    // No wallet call here (stage 2 happens after reservation creation).
    navigate("/services/parking/summary");
  };

  return (
    <PageTransitionWrapper type="secondary">
      <div className="h-screen bg-white relative">
        <header className="pt-[calc(var(--safe-top)+12px)] px-5">
          <div className="flex items-center justify-between">
            <IconButton
              onClick={() => navigate("/")}
              aria-label="Back"
              size="small"
            >
              <KeyboardBackspaceSharp className="text-black" />
            </IconButton>
            <h2 className="flex-1 text-center text-[18px] font-bold text-[#1F2A44]">
              Book Parking Slot
            </h2>
            <div className="w-[40px]" />
          </div>
        </header>

        <MaintenanceBanner />

        {existingBooking && (
          <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-160px)] px-8">
            <div className="w-20 h-20 rounded-full bg-[#FFE1C9] grid place-items-center mb-5">
              <div
                className="w-12 h-12 rounded-full border-2 grid place-items-center"
                style={{ borderColor: "#ff7300", color: "#ff7300" }}
              >
                <span className="font-extrabold text-2xl">P</span>
              </div>
            </div>
            <div className="text-[19px] font-bold text-[#1F2A44]">
              You already have a booking for today
            </div>
            <div className="mt-2 text-[14px] text-[#808080] font-medium leading-snug max-w-[300px]">
              Only one parking booking is allowed per day.
            </div>
            <button
              type="button"
              className="mt-7 w-full max-w-[340px] p-[0.9rem] text-[15px] font-semibold rounded-[0.7rem] bg-primary text-white"
              onClick={() => navigate("/services/parking/bookings")}
            >
              View My Bookings
            </button>
          </div>
        )}

        {!existingBooking && (
          <>
        <section className="px-4">
          {isBookingWindowActive && (
            <div className="mt-6 border border-[#8FC4FF] bg-[#EAF3FF] rounded-lg px-3 py-2 flex items-start gap-2">
              <div className="mt-0.5">
                <div className="w-7 h-7 rounded-full bg-white grid place-items-center border border-[#8FC4FF]">
                  <AccessTimeSharp style={{ color: "#0B64C0" }} />
                </div>
              </div>
              <div className="text-[14.5px] font-medium text-[#0B64C0]">
                {reservationWindowMessage}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            {floors.map((f) => {
              const isActive = f.id === selectedFloorId;
              return (
                <button
                  key={f.id}
                  className={`px-4 py-2 rounded-full border text-[14.5px] font-semibold ${
                    isActive
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-[#E5E5E5]"
                  }`}
                  onClick={() => setSelectedFloorId(f.id)}
                  type="button"
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="px-4 mt-4 pb-[calc(7rem+var(--safe-bottom))]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-red-800 text-sm font-medium">
              {error}
            </div>
          )}

          {(loadingFloors || loadingSlots) && (
            <div className="grid place-items-center py-8">
              <CircularProgress size={30} sx={{ color: "#ff7300" }} />
            </div>
          )}

          {!loadingFloors && !loadingSlots && (
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => {
                const isSelected = slot.slotId === selectedSlot?.slotId;
                const isBooked = slot.isBooked;
                const selectionDisabled = isBooked || !isBookingWindowActive;
                const isViewOnly = !isBookingWindowActive && !isBooked;

                const borderColor = isSelected
                  ? "#ff7300"
                  : isBooked
                    ? "transparent"
                    : "#E5E5E5";
                const borderStyle: "solid" | "dashed" = isViewOnly ? "dashed" : "solid";
                const iconColor = isSelected
                  ? "#ff7300"
                  : isBooked
                    ? "#616161"
                    : "#BDBDBD";
                const bg = isBooked ? "#F2F2F2" : "white";

                return (
                  <button
                    key={slot.slotId}
                    type="button"
                    disabled={selectionDisabled}
                    onClick={() => {
                      if (!isBookingWindowActive || isBooked) return;
                      if (isSelected) {
                        setSelectedSlot(undefined);
                      } else {
                        setSelectedSlot(slot);
                      }
                    }}
                    className={`rounded-[1.2rem] border p-3 min-h-[102px] transition-colors ${
                      isSelected ? "shadow-[0_0_0_2px_rgba(255,115,0,0.15)]" : ""
                    } ${isViewOnly ? "cursor-not-allowed" : ""}`}
                    style={{
                      borderColor,
                      borderStyle,
                      backgroundColor: bg,
                    }}
                  >
                    <div
                      className="w-[42px] h-[42px] rounded-full grid place-items-center mx-auto"
                      style={{
                        border: `3px solid ${
                          isSelected ? borderColor : isBooked ? "#9E9E9E" : borderColor
                        }`,
                        color: iconColor,
                        backgroundColor: isBooked ? "#EEEEEE" : "white",
                      }}
                    >
                      <span className="font-extrabold text-xl">P</span>
                    </div>

                    <div className="mt-3 text-center">
                      <div
                        className="font-semibold"
                        style={{
                          color: isBooked ? "#3D3D3D" : "#1F2A44",
                        }}
                      >
                        {slot.slotId}
                      </div>
                      <div
                        className="text-[11.5px] font-medium mt-0.5"
                        style={{
                          color: isBooked ? "#595959" : "#6B6B6B",
                        }}
                      >
                        {formatCoins(slot.coinsPerSlot)} O2C
                      </div>
                      {isBooked && (
                        <div className="text-[10.5px] font-bold mt-1 tracking-wide text-[#595959]">
                          Unavailable
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="fixed left-4 right-4 bottom-[calc(84px+var(--safe-bottom))]">
          {reservationConfigLoaded && !isBookingWindowActive && (
            <div className="bg-[#FFF7EB] rounded-[1rem] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-[#FFB74D] px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#FFE4C4] grid place-items-center border border-[#FFB74D]">
                    <WarningAmberSharp
                      style={{ color: "#E65100", fontSize: 22 }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[#E65100] leading-snug">
                    {reservationWindowMessage}
                  </div>
                  <div className="mt-1 text-[12px] text-[#A75A2A] font-medium">
                    Slots are view-only right now. You can select and book a slot once the booking window opens.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isBookingWindowActive && selectedSlot && (
            <div className="bg-white rounded-[1rem] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E5E5E5] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[1rem] bg-[#FFE1C9] grid place-items-center">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-[#ff7300] grid place-items-center"
                      style={{ borderColor: "#ff7300", color: "#ff7300" }}
                    >
                      <span className="font-extrabold text-lg">P</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold">
                      {selectedSlot.slotId}
                    </div>
                    <div className="text-[12.5px] text-[#808080] font-medium">
                      {selectedSlot.floorName}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[12.5px] text-[#808080] font-medium">
                    TOTAL COST
                  </div>
                  <div className="text-[20px] font-extrabold text-[#1F2A44]">
                    {formatCoins(selectedSlot.coinsPerSlot)}{" "}
                    <span className="text-[#ff7300]">O2C</span>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  className="w-full p-[0.85rem] text-lg font-semibold rounded-[0.7rem] bg-primary text-white disabled:bg-[#F4F4F4] disabled:text-[#A7A7A7]"
                  disabled={
                    busyPayment ||
                    selectedSlot.isBooked ||
                    vehiclesLoading ||
                    vehiclesSetupRequired ||
                    checkingExistingBooking
                  }
                  onClick={handleProceedToPayment}
                >
                  {busyPayment
                    ? "Redirecting..."
                    : vehiclesLoading || checkingExistingBooking
                      ? "Checking..."
                      : vehiclesSetupRequired
                        ? "Add a vehicle to continue"
                        : "Proceed to Payment"}
                </button>
                {vehiclesSetupRequired && !vehiclesLoading && (
                  <button
                    type="button"
                    className="mt-3 w-full p-[0.75rem] text-[14px] font-semibold rounded-[0.7rem] border border-[#E5E5E5] bg-white text-[#1F2A44]"
                    onClick={() => navigate("/services/vehicles")}
                  >
                    Manage Personal Vehicles
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
          </>
        )}

        <BottomNav active="parking" />
      </div>
    </PageTransitionWrapper>
  );
}

export default ParkingSlotSelectionPage;

