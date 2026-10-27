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

import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import Typography from "@mui/material/Typography";

interface BackgroundLoaderProps {
  message?: string;
}

const pulse = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
`;

const BackgroundLoader: React.FC<BackgroundLoaderProps> = ({
  message = "Processing...",
}) => {
  return (
    <Backdrop
      open
      sx={{
        zIndex: 9998,
        bgcolor: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2.5,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.2 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: "#FF7300",
                animation: `${pulse} 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: "#4B5064",
            fontWeight: 600,
            fontSize: "0.85rem",
            letterSpacing: 0.3,
          }}
        >
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default BackgroundLoader;
