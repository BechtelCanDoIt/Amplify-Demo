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

import BadgeIcon from "@mui/icons-material/Badge";
import CommonPage from "@layout/pages/CommonPage";
import HistoryIcon from "@mui/icons-material/History";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CreateVisit from "@view/employee/panel/createVisit";
import VisitHistory from "@view/employee/panel/visitHistory";

export default function Visits() {
  return (
    <CommonPage
      title="Visit"
      icon={<BadgeIcon />}
      commonPageTabs={[
        {
          tabTitle: "New Visit",
          tabPath: "create-visit",
          icon: <PersonAddAlt1Icon />,
          page: <CreateVisit />,
        },
        {
          tabTitle: "History",
          tabPath: "visit-history",
          icon: <HistoryIcon />,
          page: <VisitHistory />,
        },
      ]}
    />
  );
}
