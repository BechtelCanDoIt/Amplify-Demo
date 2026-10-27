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
import { Box, Typography, useTheme } from "@mui/material";

interface MealOptionBoxProps {
  meal: {
    value: string;
    label: string;
    icon: React.ReactNode;
  };
  isSelected: boolean;
  isOrdered: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export const MealOptionBox = ({
  meal,
  isSelected,
  isOrdered,
  isDisabled,
  onClick,
}: MealOptionBoxProps) => {
  const theme = useTheme();

  const shouldShowAsOrdered = isOrdered && !isSelected;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        border: `1px solid ${
          isSelected || shouldShowAsOrdered
            ? theme.palette.customBorder.secondary.active
            : theme.palette.customBorder.territory.active
        }`,
        p: 2,
        borderRadius: 1,
        boxSizing: "border-box",
        color: theme.palette.customText.primary.p2.active,
        backgroundColor:
          isSelected || shouldShowAsOrdered
            ? theme.palette.fill.secondary_light.active
            : theme.palette.surface.secondary.active,
        "&:hover": {
          border: !isSelected
            ? `1px solid ${theme.palette.customBorder.primary.active}`
            : undefined,
        },
        opacity: isDisabled ? 0.5 : shouldShowAsOrdered ? 0.59 : 1,
        cursor: isDisabled ? "not-allowed" : "pointer",
        pointerEvents: isDisabled ? "none" : "auto",
      }}
    >
      <Typography variant="body1">{meal.label}</Typography>
      {meal.icon}
    </Box>
  );
};
