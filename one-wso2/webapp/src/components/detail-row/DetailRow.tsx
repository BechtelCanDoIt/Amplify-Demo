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

import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import type { ReactNode } from "react";

// Two-line row with a leading icon-box and an optional trailing slot
// (button, chip, timestamp, whatever the caller wants). Consolidates
// what used to be OpsRow / ConnectedRow / DirRow / RecentRow — same
// styling, same "last-child no bottom border" convention.

export interface DetailRowProps {
  icon: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  last?: boolean;
}

export default function DetailRow({ icon, title, meta, trailing, last }: DetailRowProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ py: 1.125, borderBottom: last ? 0 : 1, borderColor: "divider" }}
    >
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: 0.875,
          bgcolor: "action.hover",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 500, fontSize: 13 }}>{title}</Typography>
        {meta !== undefined && (
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{meta}</Typography>
        )}
      </Box>
      {trailing}
    </Stack>
  );
}
