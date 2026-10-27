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

import { Box, Typography } from "@wso2/oxygen-ui";
import { UsersIcon } from "@wso2/oxygen-ui-icons-react";

// Mirrors par-app's own NoDataView.tsx — an icon beside bold, primary-
// colored text — used wherever source did (ProvideFeedbackTab.tsx,
// RequestFeedbackTab.tsx) instead of a generic Alert. No background panel
// per UX review — plain icon + text on the page background.
export default function ParEmptyState({ text }: { text: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        py: 3,
      }}
    >
      <Box sx={{ color: "primary.main", mr: 1.5, display: "flex" }}>
        <UsersIcon size={28} />
      </Box>
      <Typography variant="h6" sx={{ color: "primary.main", fontWeight: 700 }}>
        {text}
      </Typography>
    </Box>
  );
}
