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

import { Typography, useTheme } from "@mui/material";

interface TitleProps {
  firstWord: string;
  secondWord: string;
  borderEnabled?: boolean;
}

export default function Title({ firstWord, secondWord, borderEnabled = true }: TitleProps) {
  const theme = useTheme();

  return (
    <Typography
      variant="h5"
      textAlign={{ xs: "center", md: "left" }}
      sx={{
        color: theme.palette.text.primary,
        fontWeight: "600",
        pb: borderEnabled ? "1rem" : 0,
        borderBottom: borderEnabled ? `1px solid ${theme.palette.divider}` : "none",
      }}
    >
      <span style={{ color: theme.palette.primary.main }}>{firstWord}</span> {secondWord}
    </Typography>
  );
}
