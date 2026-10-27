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

import { DOD_END_HOUR, DOD_START_HOUR } from "@config/constant";

export const useDodTimeActive = () => {
  const computeIsActive = () => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(DOD_START_HOUR, 0, 0, 0);
    const endTime = new Date(now);
    endTime.setHours(DOD_END_HOUR, 0, 0, 0);
    return now >= startTime && now <= endTime;
  };

  const [isActive, setIsActive] = useState(() => computeIsActive());

  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(computeIsActive());
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  return isActive;
};
