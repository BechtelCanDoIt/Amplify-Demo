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
import { SvgIconComponent } from "@mui/icons-material";
import { Box, Stack, Typography, alpha, useTheme } from "@mui/material";

interface LeaveSelectionIconProps {
  Icon: SvgIconComponent;
  label: string;
  isSelected: boolean;
  onClick?: () => void;
  info?: string;
}
export default function LeaveSelectionIcon({
  Icon: Icon,
  label,
  isSelected,
  onClick,
  info,
}: LeaveSelectionIconProps) {
  const theme = useTheme();

  return (
    <Stack
      direction="column"
      justifyContent="flex-start"
      alignItems="center"
      gap={1}
      height="100%"
      onClick={onClick}
      sx={{
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
        "&:hover": onClick
          ? {
              "& .icon-box": {
                borderColor: theme.palette.primary.main,
                backgroundColor: isSelected
                  ? theme.palette.primary.main
                  : alpha(theme.palette.primary.main, 0.06),
              },
            }
          : {},
      }}
    >
      <Box
        className="icon-box"
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          width: 48,
          height: 48,
          borderRadius: "12px",
          border: "1.5px solid",
          borderColor: isSelected
            ? theme.palette.primary.main
            : theme.palette.customBorder.territory.active,
          backgroundColor: isSelected ? theme.palette.primary.main : "transparent",
          transition: "all 0.15s ease",
        }}
      >
        <Icon
          sx={{
            fontSize: 24,
            color: isSelected
              ? theme.palette.common.white
              : theme.palette.customText.primary.p3.active,
            transition: "color 0.15s ease",
          }}
        />
      </Box>
      <Typography
        variant="caption"
        textAlign="center"
        sx={{
          color: isSelected
            ? theme.palette.primary.main
            : theme.palette.customText.primary.p3.active,
          fontWeight: isSelected ? 600 : 400,
          lineHeight: 1.3,
          transition: "all 0.15s ease",
        }}
      >
        {label}
      </Typography>
      {info && (
        <Typography
          variant="caption"
          textAlign="center"
          sx={{
            color: theme.palette.customText.primary.p4.active,
            fontSize: "0.65rem",
            lineHeight: 1.2,
            fontStyle: "italic",
          }}
        >
          {info}
        </Typography>
      )}
    </Stack>
  );
}
