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

import AssignmentIcon from "@mui/icons-material/Assignment";

import { useEffect, useState } from "react";

import TabsPage, { TabProps } from "@root/src/layout/pages/TabsPage";
import { Privileges } from "@root/src/slices/authSlice/auth";
import { useAppSelector } from "@root/src/slices/store";
import { selectUser } from "@root/src/slices/userSlice/user";

import AdminReportTab from "./panel/AdminReportTab";
import AdminSabbaticalTab from "./panel/AdminSabbaticalTab";
import LeadReportTab from "./panel/LeadReportTab";

export default function Report() {
  const [tabs, setTabs] = useState<TabProps[]>([]);
  const userInfo = useAppSelector(selectUser);

  useEffect(() => {
    const baseTabs: TabProps[] = [];
    if (userInfo?.privileges.includes(Privileges.LEAD)) {
      baseTabs.push({
        tabTitle: "Lead Report",
        tabPath: "reporting-lead",
        icon: <AssignmentIcon />,
        page: <LeadReportTab />,
      });
    }
    if (userInfo?.privileges.includes(Privileges.PEOPLE_OPS_TEAM)) {
      baseTabs.push(
        {
          tabTitle: "Admin Report",
          tabPath: "admin-report",
          icon: <AssignmentIcon />,
          page: <AdminReportTab />,
        },
        {
          tabTitle: "Sabbatical History Report",
          tabPath: "sabbatical-view",
          icon: <AssignmentIcon />,
          page: <AdminSabbaticalTab />,
        },
      );
    }
    setTabs(baseTabs);
  }, [userInfo?.privileges]);

  return (
    <>
      <TabsPage title="Leave Reports" tabsPage={tabs} />
    </>
  );
}
