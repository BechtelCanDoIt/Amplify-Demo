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

import infoIcon from "@assets/images/info-icon.svg";

export default function DodInfoMessage() {
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <Box
        component="img"
        src={infoIcon}
        alt="info"
        sx={{ width: 14, height: 14, alignContent: "center" }}
      />
      <Typography variant="body2" sx={{ color: theme.palette.customText.primary.p3.active }}>
        Dinner request option is only available from <strong>04:00pm to 07:00pm</strong> for the
        given day.
      </Typography>
    </Box>
  );
}
