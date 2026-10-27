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
import type { ReactNode } from "react";
import { CircularProgress, IconButton } from "@mui/material";
import {
  AccessTimeSharp,
  CalendarMonthSharp,
  CheckCircleSharp,
  CloseSharp,
  ContentCopySharp,
  DirectionsCarSharp,
  DoneSharp,
  LocationOnSharp,
  PaidSharp,
  ReceiptLongSharp,
  KeyboardBackspaceSharp,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { PageTransitionWrapper, BottomNav } from "@/components/shared";
import type { ParkingReservationDetails, ParkingReservationStatus } from "@/types";
import useHttp, { executeWithTokenHandling } from "@/utils/http";
import { serviceUrls } from "@/config/config";
import { getTodayBookingDate, formatBookingDate } from "@/utils/helpers/date";
import { formatCoins } from "@/utils/helpers/coins";
import { truncateAddress } from "@/utils/helpers/address";

function MyParkingBookingsPage() {
  const navigate = useNavigate();
  const { handleRequest, handleRequestWithNewToken } = useHttp();
  const today = getTodayBookingDate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [reservations, setReservations] = useState<
    ParkingReservationDetails[]
  >([]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | undefined>(
    undefined,
  );
  const [details, setDetails] = useState<ParkingReservationDetails | undefined>(
    undefined,
  );

  const openReservationDetails = (reservation: ParkingReservationDetails) => {
    setDetails(reservation);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(undefined);

    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingReservationById(reservation.id),
      "GET",
      null,
      (data) => {
        setDetails(data as ParkingReservationDetails);
        setDetailsLoading(false);
      },
      (err) => {
        setDetailsError(String(err ?? "Failed to load reservation"));
        setDetailsLoading(false);
      },
      (pending) => setDetailsLoading(pending),
    );
  };

  const closeReservationDetails = () => {
    setDetailsOpen(false);
    setDetailsLoading(false);
    setDetailsError(undefined);
    setDetails(undefined);
  };

  useEffect(() => {
    executeWithTokenHandling(
      handleRequest,
      handleRequestWithNewToken,
      serviceUrls.fetchParkingReservations(),
      "GET",
      null,
      (data) => {
        setReservations(data as ParkingReservationDetails[]);
        setLoading(false);
      },
      (err) => {
        setError(String(err ?? "Failed to load bookings"));
        setLoading(false);
      },
      (pending) => setLoading(pending),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBookings = useMemo(() => {
    const confirmedToday = reservations.filter(
      (r) => r.bookingDate === today && r.status === ("CONFIRMED" as ParkingReservationStatus),
    );
    // If multiple exist, show the latest createdOn first.
    return confirmedToday.sort((a, b) =>
      String(b.createdOn).localeCompare(String(a.createdOn)),
    );
  }, [reservations, today]);

  const pastBookings = useMemo(() => {
    return reservations
      .filter(
        (r) =>
          r.status === ("CONFIRMED" as ParkingReservationStatus) &&
          r.bookingDate < today,
      )
      .sort((a, b) =>
        String(b.bookingDate).localeCompare(String(a.bookingDate)),
      );
  }, [reservations, today]);

  return (
    <PageTransitionWrapper type="secondary">
      <div className="h-screen bg-white relative flex flex-col">
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
              My Bookings
            </h2>
            <div className="w-[40px]" />
          </div>
        </header>

        <section className="px-4 mt-5 pb-[calc(7rem+var(--safe-bottom))] overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-red-800 text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid place-items-center py-10">
              <CircularProgress size={34} sx={{ color: "#ff7300" }} />
            </div>
          ) : (
            <>
              <div className="text-[13px] font-bold text-[#808080] mb-3">
                ACTIVE
              </div>

              {activeBookings.length === 0 ? (
                <div className="border border-[#E5E5E5] rounded-[1.2rem] px-4 py-6 text-center text-[#808080] font-medium">
                  No active bookings found.
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeBookings.map((r) => (
                    <ActiveBookingCard
                      key={r.id}
                      reservation={r}
                      onOpen={() => openReservationDetails(r)}
                    />
                  ))}
                </div>
              )}

              <div className="text-[13px] font-bold text-[#808080] mt-6 mb-3">
                PAST
              </div>

              {pastBookings.length === 0 ? (
                <div className="border border-[#E5E5E5] rounded-[1.2rem] px-4 py-6 text-center text-[#808080] font-medium">
                  No past bookings yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {pastBookings.map((r) => (
                    <PastBookingCard
                      key={r.id}
                      reservation={r}
                      onOpen={() => openReservationDetails(r)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {detailsOpen && (
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-30 grid place-items-center px-5"
            onClick={closeReservationDetails}
          >
            <div
              className="w-full max-w-[380px] bg-white border border-red-200 rounded-[1.2rem] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="text-[#1F2A44] font-extrabold text-[16px]">
                  Reservation Details
                </div>
                <IconButton
                  onClick={closeReservationDetails}
                  aria-label="Close details"
                  size="small"
                >
                  <CloseSharp />
                </IconButton>
              </div>

              {detailsLoading ? (
                <div className="grid place-items-center py-6">
                  <CircularProgress size={28} sx={{ color: "#ff7300" }} />
                </div>
              ) : detailsError ? (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-800 text-sm font-medium">
                  {detailsError}
                </div>
              ) : details ? (
                <div className="mt-3">
                  <ReservationStatusBadge status={details.status} />

                  <div className="mt-3 text-[22px] font-extrabold text-[#1F2A44]">
                    {details.slotId}
                  </div>
                  <div className="mt-1 text-[#808080] text-[14px] font-medium flex items-center gap-2">
                    <LocationOnSharp style={{ fontSize: 16 }} />
                    {details.floorName}
                  </div>

                  <div className="mt-3">
                    <InfoBox
                      label="Date"
                      value={formatBookingDate(details.bookingDate)}
                      icon={<CalendarMonthSharp style={{ fontSize: 18, color: "#808080" }} />}
                    />
                  </div>

                  <div className="mt-3">
                    <InfoBox
                      label="Vehicle"
                      value={details.vehicleRegistrationNumber}
                      icon={
                        <DirectionsCarSharp
                          style={{ fontSize: 18, color: "#808080" }}
                        />
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <InfoBox
                      label="Amount"
                      value={`${formatCoins(details.coinsAmount)} O2C`}
                      icon={
                        <PaidSharp
                          style={{ fontSize: 18, color: "#808080" }}
                        />
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <InfoBox
                      label="Time"
                      value={formatTransactionTime(details.createdOn)}
                      icon={
                        <AccessTimeSharp
                          style={{ fontSize: 18, color: "#808080" }}
                        />
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <InfoBox
                      label="Payment Reference"
                      value={
                        details.paymentReference
                          ? truncateAddress(details.paymentReference)
                          : "Not available for this reservation."
                      }
                      copyValue={details.paymentReference ?? undefined}
                      icon={
                        <ReceiptLongSharp
                          style={{ fontSize: 18, color: "#808080" }}
                        />
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <BottomNav active="history" />
      </div>
    </PageTransitionWrapper>
  );
}

function ReservationStatusBadge({ status }: { status: ParkingReservationStatus | string }) {
  const normalized = String(status);
  const isConfirmed = normalized === ("CONFIRMED" as ParkingReservationStatus);

  if (!isConfirmed) return null;

  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#EAF9EF] text-[#2ECC71] text-[12px] font-extrabold">
      <CheckCircleSharp style={{ fontSize: 16, marginRight: 6 }} />
      CONFIRMED
    </div>
  );
}

function ActiveBookingCard({
  reservation,
  onOpen,
}: {
  reservation: ParkingReservationDetails;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className="border border-[#ff7300] rounded-[1.2rem] px-4 py-4 bg-[#FFF2E8] cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#ff7300] text-white text-[12px] font-extrabold">
            CONFIRMED
          </div>
          <div className="mt-3 text-[34px] font-extrabold text-[#ff7300] leading-none">
            {reservation.slotId}
          </div>
          <div className="text-[#808080] font-medium mt-1 flex items-center gap-2">
            <LocationOnSharp style={{ fontSize: 18 }} />
            <span>{reservation.floorName}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[26px] font-extrabold text-[#ff7300]">
            {formatCoins(reservation.coinsAmount)}{" "}
            <span className="text-[#1F2A44] text-[16px]">O2C</span>
          </div>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-[#EAF9EF] text-[#2ECC71] font-extrabold text-[12px]">
            PAID
          </div>
        </div>
      </div>

      <div className="mt-4">
        <InfoBox
          label="DATE"
          value={formatBookingDate(reservation.bookingDate)}
          icon={<CalendarMonthSharp style={{ fontSize: 18, color: "#808080" }} />}
        />
      </div>
    </div>
  );
}

function PastBookingCard({
  reservation,
  onOpen,
}: {
  reservation: ParkingReservationDetails;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className="border border-[#E5E5E5] rounded-[1rem] px-4 py-3 bg-white flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full grid place-items-center bg-[#EAF9EF] text-[#2ECC71]"
        >
          <CheckCircleSharp style={{ fontSize: 22 }} />
        </div>
        <div>
          <div className="text-[16px] font-extrabold text-[#1F2A44]">
            {reservation.slotId}
          </div>
          <div className="text-[12.5px] text-[#808080] font-medium mt-0.5">
            {formatBookingDate(reservation.bookingDate)}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[16px] font-extrabold text-[#1F2A44]">
          {formatCoins(reservation.coinsAmount)}{" "}
          <span className="text-[12.5px] font-bold">O2C</span>
        </div>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  icon,
  copyValue,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!copyValue) return;
    navigator.clipboard
      ?.writeText(copyValue)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[0.8rem] py-3 px-3">
      <div className="flex items-center gap-2 text-[#808080] text-[12px] font-bold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 truncate text-[#1F2A44] font-extrabold text-[15px]">
          {value}
        </div>
        {copyValue && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy"}
            className="shrink-0 text-[#808080] active:text-[#1F2A44]"
          >
            {copied ? (
              <DoneSharp style={{ fontSize: 18, color: "#2ECC71" }} />
            ) : (
              <ContentCopySharp style={{ fontSize: 18 }} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function formatTransactionTime(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  // DB timestamps are UTC and look like "2026-09-08 06:33:15.556"; make them
  // Safari-parseable and mark them UTC ("Z") so the time renders in the device's
  // local timezone.
  const parsed = new Date(raw.replace(" ", "T").slice(0, 19) + "Z");
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default MyParkingBookingsPage;

