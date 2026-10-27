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
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { STEPS } from "@features/sales/cado2/quotes/form/draftForm";
import { STEP_HINTS_LONG } from "./stepText";

/** "Step 2 of 4 · Products & Pricing" with what the step is for. */
export default function StepIntro({ step }: { step: number }): JSX.Element {
  return (
    <Box sx={{ px: 0.5 }}>
      <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, lineHeight: 1.6 }}>
        Step {step + 1} of {STEPS.length}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ sm: 1.5 }} alignItems={{ sm: "baseline" }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {STEPS[step]}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {STEP_HINTS_LONG[step]}
        </Typography>
      </Stack>
    </Box>
  );
}
