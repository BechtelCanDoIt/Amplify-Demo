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

// Ports panels/employeesHistory.tsx — the caller's own direct reports
// (GET /employees?managerEmail=), each opening PromotionEmployeeHistoryDialog.
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import PromotionTeamRoster from "../components/PromotionTeamRoster";

export default function TeamDirectReportsTab() {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const email = userInfo.data?.workEmail ?? asgardeoUser.email;
  return <PromotionTeamRoster kind="direct" email={email} />;
}
