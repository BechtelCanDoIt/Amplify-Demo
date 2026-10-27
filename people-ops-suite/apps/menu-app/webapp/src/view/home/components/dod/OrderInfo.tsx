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

interface OrderInfoSectionProps {
  mealType: string;
  onCancelClick: () => void;
}

export const OrderInfoSection = ({ mealType, onCancelClick }: OrderInfoSectionProps) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="body2" sx={{ color: theme.palette.customText.primary.p3.active }}>
        You've successfully ordered a{" "}
        <Box component="span" sx={{ color: theme.palette.customText.primary.p1.active }}>
          {mealType} meal
        </Box>{" "}
        for dinner and you can collect it from ground floor.
      </Typography>

      <Typography variant="body2" sx={{ color: theme.palette.customText.primary.p3.active }}>
        To update the meal{" "}
        <Box component="span" sx={{ color: theme.palette.customText.primary.p1.active }}>
          choose different meal option and submit.
        </Box>
      </Typography>

      <Typography variant="body2" sx={{ color: theme.palette.customText.primary.p3.active }}>
        To Cancel the order click{" "}
        <Box
          component="span"
          onClick={onCancelClick}
          role="button"
          sx={{
            color: "#CC5500",
            cursor: "pointer",
            textDecoration: "underline",
            "&:hover": {
              fontWeight: 600,
            },
          }}
        >
          Cancel
        </Box>
      </Typography>
    </Box>
  );
};
