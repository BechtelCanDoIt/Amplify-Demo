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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CheckCircleSharp } from "@mui/icons-material";

import { PageTransitionWrapper } from "@/components/shared";
import { formatBookingDate } from "@/utils/helpers/date";
import {
  clearConfirmationState,
  getConfirmationState,
} from "@/utils/parkingStorage";
import type { ParkingReservationDetails } from "@/types";

function ParkingBookingConfirmationPage() {
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<
    ParkingReservationDetails | undefined
  >(undefined);

  useEffect(() => {
    setReservation(getConfirmationState());
  }, []);

  const receipt = reservation;

  useEffect(() => {
    return () => {
      // Clear confirmation details when leaving to avoid stale receipts.
      if (receipt) clearConfirmationState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt?.id]);

  if (!receipt) {
    return (
      <PageTransitionWrapper type="secondary">
        <div className="h-screen bg-white grid place-items-center px-6">
          <div className="text-center">
            <div className="text-[#1F2A44] font-semibold text-lg mb-2">
              Booking receipt not found
            </div>
            <div className="text-[#808080] font-medium mb-6">
              Please check your bookings history.
            </div>
            <button
              type="button"
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold"
              onClick={() => navigate("/services/parking/bookings")}
            >
              Go to My Bookings
            </button>
          </div>
        </div>
      </PageTransitionWrapper>
    );
  }

  return (
    <PageTransitionWrapper type="secondary">
      <div className="h-screen bg-white relative overflow-hidden">
        <div className="px-5 pt-[calc(var(--safe-top)+24px)]">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#EAF9EF] grid place-items-center">
              <CheckCircleSharp style={{ color: "#2ECC71", fontSize: 52 }} />
            </div>
            <div className="text-[26px] font-extrabold text-[#1F2A44] mt-5">
              Booking Successful!
            </div>
          </div>

          <div className="mt-6 bg-white border border-[#E5E5E5] rounded-[1.2rem] p-4">
            <ReceiptRow label="Date" value={formatBookingDate(receipt.bookingDate)} />
            <ReceiptRow
              label="Vehicle"
              value={receipt.vehicleRegistrationNumber}
            />
            <ReceiptRow label="Floor" value={receipt.floorName} />
            <ReceiptRow label="Slot Number" value={receipt.slotId} highlight />
          </div>

          <div className="mt-5">
            <button
              type="button"
              className="w-full p-[0.9rem] text-lg font-semibold rounded-[0.7rem] bg-primary text-white"
              onClick={() => navigate("/services/parking/bookings")}
            >
              View My Bookings
            </button>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="w-full p-[0.9rem] text-lg font-semibold rounded-[0.7rem] border border-[#E5E5E5] bg-white text-[#1F2A44]"
              onClick={() => navigate("/services/parking")}
            >
              Back to Home
            </button>
          </div>

          <div className="h-16" />
        </div>

      </div>
    </PageTransitionWrapper>
  );
}

function ReceiptRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E5E5E5]">
      <div className="text-[#808080] text-[13px] font-medium">{label}</div>
      <div
        className={`text-[15px] font-extrabold ${highlight ? "text-[#ff7300]" : "text-[#1F2A44]"}`}
      >
        {value}
      </div>
    </div>
  );
}

export default ParkingBookingConfirmationPage;

