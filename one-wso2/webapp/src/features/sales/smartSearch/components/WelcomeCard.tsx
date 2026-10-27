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

import type { JSX } from "react";
import { Box, Button, Paper, Stack, Typography } from "@wso2/oxygen-ui";
import { CompassIcon } from "@wso2/oxygen-ui-icons-react";
import { useIntroCard } from "../util/useLibraryStorage";

/** Said once, the first time someone opens the Library; dismissed for good with one click. */
export default function WelcomeCard(): JSX.Element | null {
  const { show, dismiss } = useIntroCard();
  if (!show) return null;
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, p: 2, mt: 2.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Box sx={{ color: "primary.main", display: "flex", pt: 0.25 }}>
          <CompassIcon size={20} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">New in Sales: Ask Sales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Ask a question about Pitstop content and jump straight to the right page, slide or video moment.
          </Typography>
        </Box>
        <Button size="small" onClick={dismiss}>
          Got it
        </Button>
      </Stack>
    </Paper>
  );
}
