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

import { AnimatePresence } from "motion/react";
import {
  Routes,
  Route,
  useLocation,
  Navigate,
  HashRouter,
} from "react-router-dom";

import {
  Home,
  VehicleManagement,
  ParkingSlotSelection,
  ParkingBookingSummary,
  ParkingBookingConfirmation,
  MyParkingBookings,
} from "@/pages";
import type { PageProps, User } from "@/types";
import { useEffect, useLayoutEffect, useState } from "react";
import { getToken, requestDeviceSafeAreaInsets } from "./components/microapp-bridge";
import { getDisplayNameFromJwt, getEmailFromJwt } from "@/utils/http";

function AnimatedRoutes({ user }: PageProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="" element={<Home user={user} />} />
        <Route path="/services/vehicles" element={<VehicleManagement />} />
        <Route path="/services/parking" element={<ParkingSlotSelection />} />
        <Route
          path="/services/parking/summary"
          element={<ParkingBookingSummary />}
        />
        <Route
          path="/services/parking/confirmation"
          element={<ParkingBookingConfirmation />}
        />
        <Route
          path="/services/parking/bookings"
          element={<MyParkingBookings />}
        />

        {/* Catch-all route: Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [user, setUser] = useState<User | undefined>(undefined);

  useLayoutEffect(() => {
    requestDeviceSafeAreaInsets((data) => {
      if (data?.insets) {
        const { top, right, bottom, left } = data.insets;
        const root = document.documentElement;
        root.style.setProperty("--safe-top", `${top}px`);
        root.style.setProperty("--safe-right", `${right}px`);
        root.style.setProperty("--safe-bottom", `${bottom}px`);
        root.style.setProperty("--safe-left", `${left}px`);
      }
    });
  }, []);

  useEffect(() => {
    const init = () => {
      getToken((token: string | undefined) => {
        if (token) {
          setUser({
            name: getDisplayNameFromJwt(token) ?? "",
            email: getEmailFromJwt(token) ?? "",
          });
        }
      });
    };

    init();
  }, []);

  return (
    <HashRouter>
      <AnimatedRoutes user={user} />
    </HashRouter>
  );
}

export default App;
