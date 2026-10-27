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

import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { ChevronDownIcon } from "@wso2/oxygen-ui-icons-react";
import DueDiligenceShell from "@features/due-diligence/components/DueDiligenceShell";
import DueDiligenceLocked from "@features/due-diligence/components/DueDiligenceLocked";
import { DUE_DILIGENCE_EYEBROW } from "@constants/dueDiligenceApps";
import { humanizeHttpError } from "@api/http";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import { usePreferences } from "../api/usePreferences";
import RatioTable from "../components/RatioTable";
import EmailPreferences from "../components/EmailPreferences";

// Ported from the source app's Preferences/Preferences.js. Admin-only —
// the rail/registry only restricts the "dd-preferences" MENU ITEM to admins
// (see useDueDiligenceGate.canSee); that's a navigation hint, not an access
// boundary. DueDiligenceShell's own requireAuthorized ladder only checks
// "holds any due-diligence role at all", so someone with a non-admin role
// who opens this URL directly would otherwise reach the full edit body.
// The explicit gate.isAdmin check below is the actual boundary.
const RATIO_CATEGORIES = [
  "Rating scale",
  "Current ratio",
  "Cash ratio",
  "Debt ratio",
  "Revenue",
  "Revenue growth",
  "WC",
];

export default function PreferencesPage() {
  const gate = useDueDiligenceGate();
  const preferences = usePreferences();

  return (
    <DueDiligenceShell
      eyebrow={DUE_DILIGENCE_EYEBROW}
      title="Preferences"
      subtitle="Ratio scoring scales and notification email recipients."
    >
      {!gate.isAdmin ? (
        <DueDiligenceLocked />
      ) : (
        <>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            Notification Email Preferences
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Add emails to be notified when resellers and trade references submit their forms.
          </Typography>
          <EmailPreferences />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ChevronDownIcon size={16} />}>
          <Typography sx={{ fontWeight: 600 }} variant="body2">
            Credit Score Scale Preferences
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Leave Min Value/Max Value empty if there's no limit.
          </Typography>
          {preferences.isLoading ? (
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Loading ratio scales…
              </Typography>
            </Stack>
          ) : preferences.isError ? (
            <Alert severity="error">Couldn't load ratio scales. {humanizeHttpError(preferences.error)}</Alert>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 3,
              }}
            >
              {RATIO_CATEGORIES.map((category) => (
                <RatioTable
                  key={category}
                  category={category}
                  ratios={(preferences.data?.ratios ?? []).filter((r) => r.ratioCategory === category)}
                />
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
        </>
      )}
    </DueDiligenceShell>
  );
}
