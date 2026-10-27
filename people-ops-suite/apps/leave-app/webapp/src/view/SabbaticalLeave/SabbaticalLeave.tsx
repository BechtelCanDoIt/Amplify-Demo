// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import Title from "@root/src/component/common/Title";
import { RootState, useAppSelector } from "@root/src/slices/store";
import { selectUser } from "@root/src/slices/userSlice/user";
import ApplyTab from "@root/src/view/SabbaticalLeave/Panel/ApplyTab";

// Tabs for Sabbatical Leave (Apply, Approve Leave, Approval History, Functional Lead View)
export default function SabbaticalLeave() {
  const [sabbaticalFeatureEnabled, setSabbaticalFeatureEnabled] = useState<boolean>(false);
  const userInfo = useAppSelector(selectUser);
  const { config: appConfig } = useAppSelector((state: RootState) => state.appConfig);

  useEffect(() => {
    if (appConfig) {
      setSabbaticalFeatureEnabled(appConfig.isSabbaticalLeaveEnabled);
    }
  }, [appConfig, userInfo?.privileges]);

  if (!sabbaticalFeatureEnabled) {
    return (
      <Title
        firstWord="Sabbatical "
        secondWord="Leave Feature is currently not available. Please check again later."
      />
    );
  }

  return (
    <ApplyTab
      sabbaticalPolicyUrl={appConfig?.sabbaticalLeavePolicyUrl ?? ""}
      sabbaticalUserGuideUrl={appConfig?.sabbaticalLeaveUserGuideUrl ?? ""}
      sabbaticalLeaveEligibilityDuration={appConfig?.sabbaticalLeaveEligibilityDuration ?? 0}
      sabbaticalLeaveMaxApplicationDuration={appConfig?.sabbaticalLeaveMaxApplicationDuration ?? 0}
      sabbaticalLeaveMinJobBand={appConfig?.sabbaticalLeaveMinJobBand ?? 0}
    />
  );
}
