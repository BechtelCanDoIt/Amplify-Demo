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

import { Link } from "react-router-dom";
import type { ServiceInfo } from "@/types";

/**
 * ServiceTile Component
 *
 * Renders a clickable tile representing a service. Displays the service name,
 * a short description, and an icon. On click, it navigates to the provided route.
 *
 * Typically used in service listings, dashboards, or menus where multiple services
 * are shown as individual items the user can interact with.
 *
 * Props (from ServiceInfo type):
 * - name: string – name/title of the service
 * - description: string – brief info or summary of the service
 * - icon: ReactNode – visual icon representing the service
 * - iconBg: string – CSS color string applied as the icon container background (e.g. "#FFE1C9")
 * - route: string – path to navigate to when the tile is clicked
 */
function ServiceTile(props: ServiceInfo) {
  return (
    <Link to={props.route}>
      <div className="flex items-center gap-4 bg-white rounded-[1.6rem] px-5 py-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div
          className="w-[4.4rem] h-[4.4rem] rounded-[1.1rem] relative overflow-hidden shrink-0"
          style={{ backgroundColor: props.iconBg }}
        >
          {props.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[1rem] text-[#1A2340] leading-snug">{props.name}</h3>
          <p className="font-normal text-[0.82rem] text-[#6B7280] mt-1 leading-snug">
            {props.description}
          </p>
        </div>
        <div className="w-[2rem] h-[2rem] rounded-full border border-[#DEDEDE] grid place-items-center shrink-0 text-[#ADADAD] text-base">
          <span aria-hidden="true">›</span>
        </div>
      </div>
    </Link>
  );
}

export default ServiceTile;
