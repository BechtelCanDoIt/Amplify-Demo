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
import IconButton from "@mui/material/IconButton";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { goToMyAppsScreen } from "../../microapp-bridge";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goToMyAppsScreen();
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.5,
        bgcolor: "#FFFFFF",
        borderBottom: "1px solid #E9EBF5",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {showBack && (
          <IconButton
            onClick={handleBack}
            sx={{ ml: -0.5, color: "#4B5064" }}
            size="small"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
        )}
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, color: "#4B5064", fontSize: "1.125rem" }}
        >
          {title}
        </Typography>
      </Box>
      {rightAction && <Box>{rightAction}</Box>}
    </Box>
  );
};

export default Header;
