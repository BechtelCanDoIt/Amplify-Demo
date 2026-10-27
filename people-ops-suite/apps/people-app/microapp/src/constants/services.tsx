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

import type { ServiceInfo } from "@/types";
import { VehicleServiceIcon } from "@/components/shared/Icons";

export const services: ServiceInfo[] = [
  {
    name: "Book Parking Slot",
    description: "Reserve a secure parking spot for your vehicle.",
    route: "/services/parking",
    iconBg: "#FFE1C9",
    icon: (
      <div className="w-full h-full grid place-items-center text-[#ff7300]">
        <span className="font-extrabold text-[34px] leading-none">P</span>
      </div>
    ),
  },
  {
    name: "Manage Personal Vehicles",
    description: "Register and manage your personal vehicles.",
    route: "/services/vehicles",
    iconBg: "#DBEAFE",
    icon: (
      <VehicleServiceIcon width="100%" height="100%" className="scale-[0.72] text-[#4A90D9]" />
    ),
  },
];
