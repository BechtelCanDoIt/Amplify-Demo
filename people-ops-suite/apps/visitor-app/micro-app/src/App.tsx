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

import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Box from "@mui/material/Box";
import TabLayout from "./components/TabLayout";
import { requestDeviceSafeAreaInsets } from "./microapp-bridge";
import SplashScreen from "./pages/SplashScreen";
import { initializeUserFromToken } from "./services/auth";
import { useMicroappStore } from "./stores/microapp/microapp";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { setDeviceSafeAreaInsets } = useMicroappStore();

  // Initialize user token and request device safe area insets
  useEffect(() => {
    initializeUserFromToken();
    requestDeviceSafeAreaInsets((data) => {
      if (data) {
        setDeviceSafeAreaInsets(data.insets);
      }
    });
  }, []);

  // Show splash screen for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <Box
      sx={{
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#FFFFFF",
      }}
    >
      <HashRouter>
        <Routes>
          {/* Redirect root to first tab */}
          <Route path="/" element={<Navigate to="/create-visit" replace />} />

          {/* All tab routes go through TabLayout */}
          <Route path="/*" element={<TabLayout />} />
        </Routes>
      </HashRouter>
    </Box>
  );
}

export default App;
