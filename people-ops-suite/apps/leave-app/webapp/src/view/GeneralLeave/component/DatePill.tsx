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
import { Box, Typography, alpha, useTheme } from "@mui/material";

interface DatePillProps {
  partOfDay: string;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export default function DatePill({
  partOfDay,
  isSelected = false,
  onClick,
  disabled = false,
}: DatePillProps) {
  const theme = useTheme();

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        flex: 1,
        py: 1,
        px: 2,
        borderRadius: "10px",
        textAlign: "center",
        border: "1.5px solid",
        borderColor: isSelected
          ? theme.palette.primary.main
          : theme.palette.customBorder.territory.active,
        backgroundColor: isSelected ? theme.palette.primary.main : "transparent",
        cursor: disabled ? "not-allowed" : onClick ? "pointer" : "default",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s ease",
        "&:hover":
          onClick && !disabled
            ? {
                borderColor: theme.palette.primary.main,
                backgroundColor: isSelected
                  ? theme.palette.primary.main
                  : alpha(theme.palette.primary.main, 0.06),
              }
            : {},
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: isSelected
            ? theme.palette.common.white
            : theme.palette.customText.primary.p2.active,
          fontWeight: isSelected ? 600 : 400,
          transition: "color 0.15s ease",
          whiteSpace: "nowrap",
        }}
      >
        {partOfDay}
      </Typography>
    </Box>
  );
}
