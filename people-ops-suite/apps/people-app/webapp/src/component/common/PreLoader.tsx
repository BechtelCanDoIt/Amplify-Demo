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

import { APP_NAME } from "@config/config";
import logoBlack from "@assets/images/WSO2-Logo-Black.png";
import logoWhite from "@assets/images/WSO2-Logo-White.png";
import { alpha, Box, Typography, useTheme } from "@mui/material";

interface StatusWithActionProps {
  message: string | null;
  hideLogo?: boolean;
  isLoading?: boolean;
}

const PreLoader = (props: StatusWithActionProps) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.palette.background.gradient,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2.5,
          px: 7,
          py: 6,
          borderRadius: 3,
          backgroundColor: alpha(
            theme.palette.background.paper,
            isDark ? 0.55 : 0.75,
          ),
          backdropFilter: "blur(16px)",
          boxShadow: isDark
            ? "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
          minWidth: 300,
        }}
      >
        {/* Logo */}
        {!props.hideLogo && (
          <Box
            component="img"
            alt="logo"
            src={isDark ? logoWhite : logoBlack}
            sx={{ width: 110, height: "auto", opacity: isDark ? 0.9 : 1 }}
          />
        )}

        {/* App name */}
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h5"
            fontWeight={700}
            color="text.primary"
            sx={{ letterSpacing: "-0.3px" }}
          >
            {APP_NAME}
          </Typography>
        </Box>

        {/* Animated dots */}
        {props.isLoading && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", my: 0.5 }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#ff7300",
                  "@keyframes dotPulse": {
                    "0%, 60%, 100%": {
                      opacity: 0.2,
                      transform: "scale(0.75)",
                    },
                    "30%": {
                      opacity: 1,
                      transform: "scale(1)",
                    },
                  },
                  animation: "dotPulse 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </Box>
        )}

        {/* Status message */}
        {props.message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.78rem", letterSpacing: "0.2px" }}
          >
            {props.message}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PreLoader;
