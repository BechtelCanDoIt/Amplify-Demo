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

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

const SplashScreen: React.FC = () => {
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#FFFFFF",
      }}
    >
      <Stack alignItems="center" spacing={3}>
        {/* App Icon */}
        <Box
          component="img"
          src="./favicon.svg"
          alt="Visitor App"
          sx={{
            width: 80,
            height: 80,
            borderRadius: "16px",
            boxShadow: 3,
          }}
        />

        {/* App Title */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#4B5064" }}>
            Visitor App
          </Typography>
          <Typography variant="body2" sx={{ color: "#7E87AD", mt: 0.5 }}>
            Manage your visitors
          </Typography>
        </Box>

        {/* Loading Dots */}
        <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
          <Box
            className="loading-dot"
            sx={{
              width: 8,
              height: 8,
              bgcolor: "#FF7300",
              borderRadius: "50%",
            }}
            style={{ animationDelay: "0s" }}
          />
          <Box
            className="loading-dot"
            sx={{
              width: 8,
              height: 8,
              bgcolor: "#FF7300",
              borderRadius: "50%",
            }}
            style={{ animationDelay: "0.2s" }}
          />
          <Box
            className="loading-dot"
            sx={{
              width: 8,
              height: 8,
              bgcolor: "#FF7300",
              borderRadius: "50%",
            }}
            style={{ animationDelay: "0.4s" }}
          />
        </Stack>
      </Stack>
    </Box>
  );
};

export default SplashScreen;
