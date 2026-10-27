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

import {
  DirectionsCarSharp,
  TwoWheelerSharp,
  DeleteSharp,
} from "@mui/icons-material";

import type { VehicleType } from "@/types";
import { IconButton } from "@mui/material";

export interface VehicleRowProps {
  id: number;
  index: number;
  type: VehicleType;
  number: string;
  selected?: boolean;
  active?: boolean;
  onSelect?: (index: number | undefined) => void;
  onDelete: () => void;
}

/**
 * VehicleRow Component
 *
 * Displays a single vehicle entry in a list, showing its type, number, and index.
 * Includes a toggleable options menu (with delete functionality) triggered by the More icon.
 *
 * Handles selection state to reveal the `MoreOptions` panel and supports vehicle deletion
 * via a mutation. Visual styling adjusts based on whether the row is active or selected.
 *
 * Props (VehicleRowProps):
 * - id: number – unique identifier for the vehicle (used for deletion)
 * - index: number – position of the vehicle in the list (displayed to user)
 * - type: "CAR" | "MOTORCYCLE" – vehicle type (used to display appropriate icon)
 * - number: string – license plate or vehicle number
 * - selected?: boolean – whether the row is currently selected (i.e., showing options)
 * - active?: boolean – whether the vehicle is currently active (used to dim non-selected rows)
 * - onDelete: () => void – callback after successful vehicle deletion
 */
function VehicleRow({
  index,
  type,
  number,
  selected = false,
  active = false,
  onDelete,
}: VehicleRowProps) {
  return (
    <div className="font-semibold text-lg border-b-[1px] border-[#E5E5E5]">
      <div
        className="grid grid-cols-[0.3fr_0.5fr_1fr_0.8fr] items-center px-1 py-[0.68rem] transition-opacity ease-out relative"
        style={{ opacity: active && !selected ? "50%" : "100%" }}
      >
        <span className="justify-self-start text-[#A6A6A6] text-[18px]">
          {index}
        </span>
        <span className="justify-self-center">
          {type === "MOTORCYCLE" ? (
            <TwoWheelerSharp className="scale-[1.32] text-primary" />
          ) : (
            <DirectionsCarSharp className="scale-[1.213] text-primary" />
          )}
        </span>
        <span className="justify-self-center">{number}</span>
        <span className="justify-self-end">
          <IconButton
            onClick={() => {
              onDelete(); // opens the delete confirmation modal
            }}
            style={{ padding: 5, backgroundColor: "#f0efed" }}
          >
            <DeleteSharp className="scale-[1.05] text-[#fc5a4e]" />
          </IconButton>
        </span>
      </div>
    </div>
  );
}

export default VehicleRow;
