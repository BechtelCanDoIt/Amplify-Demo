// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { Route, Routes } from "react-router-dom";
import Box from "@mui/material/Box";
import Tabbar from "./Tabbar/Tabbar";
import CreateVisit from "../pages/CreateVisit/CreateVisit";
import VisitHistory from "../pages/VisitHistory/VisitHistory";

const TabLayout: React.FC = () => {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Main content area */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <Routes>
          <Route path="/create-visit" element={<CreateVisit />} />
          <Route path="/visit-history" element={<VisitHistory />} />
        </Routes>
      </Box>

      {/* Bottom Tab Bar */}
      <Tabbar />
    </Box>
  );
};

export default TabLayout;
