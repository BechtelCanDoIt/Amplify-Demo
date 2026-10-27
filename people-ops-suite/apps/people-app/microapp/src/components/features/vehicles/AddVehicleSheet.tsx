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

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { CircularProgress } from "@mui/material";
import { TwoWheelerSharp, DirectionsCarSharp } from "@mui/icons-material";

import { BottomSheet } from "@/components/shared";
import { OptionGroup, IconOption } from "@/components/features/vehicles";
import { validation } from "@/constants";
import type { Validity, VehicleType } from "@/types";
import { TextInput } from "@/components/ui";
import {
  validate,
  format as formatLicensePlate,
} from "@/utils/helpers/numberplate";
import { serviceUrls } from "@/config/config";
import useHttp, { executeWithTokenHandling, getEmailAsync } from "@/utils/http";
import { Logger } from "@/utils/logger";

interface AddVehicleSheetProps {
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * AddVehicleSheet Component
 *
 * A bottom sheet modal used for registering a new vehicle. Allows users to select a vehicle type (Car or Motorcycle),
 * enter a license plate number, and submit the information to the backend via a mutation.
 *
 * Includes input validation for the license plate and shows a loading state during registration.
 * Designed for use in flows where users need to add their vehicle to an account or booking process.
 *
 * Props (AddVehicleSheetProps):
 * - onClose: () => void – callback to close the sheet
 * - onSubmit: () => void – callback after successful registration
 *
 * State:
 * - number: vehicle plate number entered by the user
 * - type: selected vehicle type (CAR or MOTORCYCLE)
 * - isValidPlate: validation state of the license plate (from `validation` enum)
 *
 * Behavior:
 * - Disables submission if input is invalid or a vehicle type isn't selected
 * - Shows a spinner overlay when the mutation is in progress
 * - Automatically formats the plate before submission
 */
function AddVehicleSheet({ onClose, onSubmit }: AddVehicleSheetProps) {
  const [number, setNumber] = useState<string>("");
  const [type, setType] = useState<VehicleType | undefined>("CAR");
  const [isValidPlate, setIsValidPlate] = useState<Validity>(
    validation.UNCERTAIN,
  );

  // for disabling button while request is pending. re-enabling on error for retry.
  const [busy, setBusy] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumber(e.target.value);
    setIsValidPlate(validate(e.target.value));
  };

  const { handleRequest, handleRequestWithNewToken } = useHttp();

  const handleVehicleRegistration = async () => {
    setBusy(true);
    if (type && isValidPlate === validation.VALID) {
      executeWithTokenHandling(
        handleRequest,
        handleRequestWithNewToken,
        serviceUrls.registerVehicle(await getEmailAsync()),
        "POST",
        {
          vehicleType: type,
          vehicleRegistrationNumber: formatLicensePlate(number),
        },
        () => {
          onSubmit();
          onClose();
        },
        (error) => {
          Logger.error("Error registering vehicle", error);
          setBusy(false);
        },
        (pending) => setBusy(pending),
      );
    }
  };

  return (
    <BottomSheet
      onClose={() => {
        !busy && onClose();
      }}
    >
      <div className="relative">
        <OptionGroup
          className="flex justify-center gap-[1.35rem] mt-3 mb-5"
          value={type}
          onChange={(value) => {
            setType(value as VehicleType | undefined);
          }}
        >
          <IconOption name="CAR" selected={true}>
            {({ selected }) => (
              <DirectionsCarSharp
                className={selected ? "text-white" : "text-gray-500"}
                style={{ fontSize: 32 }}
              />
            )}
          </IconOption>
          <IconOption name="MOTORCYCLE">
            {({ selected }) => (
              <TwoWheelerSharp
                className={selected ? "text-white" : "text-gray-500"}
                style={{ fontSize: 32 }}
              />
            )}
          </IconOption>
        </OptionGroup>
        <div className="mt-7">
          <TextInput
            className="uppercase placeholder:normal-case"
            label="Vehicle Number"
            placeholder="Enter your vehicle registration number"
            value={number}
            validity={isValidPlate}
            onChange={handleInputChange}
          />
          <AnimatePresence>
            {isValidPlate === validation.INVALID && (
              <motion.div
                className="text-gray-400 text-[15.5px] px-1 my-2.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
              >
                <div className="flex gap-1 items-center text-red-800">
                  <span>Invalid vehicle license plate format</span>
                </div>
                <span className="text-gray-600 opacity-70">
                  Please use a valid format, such as &nbsp;
                  <span className="text-green-900 font-semibold">
                    AAA 1234, 12 1234
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="relative mt-8">
          <button
            className="w-full p-[0.46rem] text-lg font-semibold rounded-[0.6rem] transition-colors disabled:bg-[#F4F4F4] disabled:text-[#A7A7A7] bg-primary text-white"
            disabled={isValidPlate !== validation.VALID || !type || busy}
            onClick={handleVehicleRegistration}
          >
            Save
          </button>
        </div>
        {busy && (
          <div className="size-full grid place-items-center absolute top-0 left-0 bg-white/50 transition-colors">
            <CircularProgress
              size={26}
              thickness={5}
              style={{ color: "#4a4a4a" }}
              className="mb-16"
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export default AddVehicleSheet;
