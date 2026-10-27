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
import { serviceUrls } from "@/config/config";
import { Warning } from "@mui/icons-material";
import useHttp, { executeWithTokenHandling } from "@/utils/http";

export const MaintenanceBanner = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const navigate = useNavigate();
  const { handleRequest, handleRequestWithNewToken } = useHttp();

  useEffect(() => {
    const fetchConfigs = () => {
      executeWithTokenHandling(
        handleRequest,
        handleRequestWithNewToken,
        serviceUrls.fetchAppConfigs(),
        "GET",
        null,
        (data: any) => {
          if (data) {
            setIsMaintenanceMode(!!data.isMaintenanceMode);
          }
        },
        (err) => {
          console.error("Failed to fetch app configs:", err);
        },
        () => {} // Optional loading function
      );
    };

    fetchConfigs();
    const interval = setInterval(fetchConfigs, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isMaintenanceMode) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
      <div className="bg-white dark:bg-[#1F2A44] rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center space-y-4">
        <div className="w-16 h-16 bg-[#ff7300]/10 rounded-full flex items-center justify-center mb-2">
          <Warning className="text-[#ff7300]" sx={{ fontSize: 36 }} />
        </div>
        <h2 className="text-2xl font-bold text-[#1F2A44] dark:text-white">
          Under Maintenance
        </h2>
        <p className="text-[#808080] dark:text-gray-300 mb-2">
          The app is currently undergoing maintenance and is temporarily unavailable. Please check back later.
        </p>
        <button
          onClick={() => navigate("/")}
          className="w-full mt-2 py-3 px-4 bg-primary text-white font-semibold rounded-xl"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};
