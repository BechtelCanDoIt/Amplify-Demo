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

import { HistorySharp, LocalParkingSharp } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";

type BottomNavKey = "parking" | "history";

interface BottomNavProps {
  active: BottomNavKey;
}

function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();

  const accent = "#ff7300";
  const muted = "#9B9B9B";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white pt-2 pb-[var(--safe-bottom)]">
      <div className="flex justify-around">
        <IconButton
          onClick={() => navigate("/services/parking")}
          sx={{ padding: 0 }}
          aria-label="Parking"
        >
          <div className="flex flex-col items-center gap-1">
            <LocalParkingSharp
              style={{ color: active === "parking" ? accent : muted }}
            />
            <span
              className="text-[12.5px] font-medium"
              style={{ color: active === "parking" ? accent : muted }}
            >
              Parking
            </span>
          </div>
        </IconButton>
        <IconButton
          onClick={() => navigate("/services/parking/bookings")}
          sx={{ padding: 0 }}
          aria-label="History"
        >
          <div className="flex flex-col items-center gap-1">
            <HistorySharp
              style={{ color: active === "history" ? accent : muted }}
            />
            <span
              className="text-[12.5px] font-medium"
              style={{ color: active === "history" ? accent : muted }}
            >
              History
            </span>
          </div>
        </IconButton>
      </div>
    </nav>
  );
}

export default BottomNav;

