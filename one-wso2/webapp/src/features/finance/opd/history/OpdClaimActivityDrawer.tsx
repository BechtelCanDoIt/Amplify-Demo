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


import { Box, Drawer, IconButton, Stack, Typography } from "@wso2/oxygen-ui";
import { ListChecksIcon, UsersRoundIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { historyDate } from "./opdHistoryFormat";
import { opdActivitySteps, type OpdActivityStep } from "./opdHistoryTypes";
import type { OpdClaim } from "../opdTypes";

/** The dot's colour per step state — `CustomTimelineItem.tsx:44-70`. */
function toneFor(step: OpdActivityStep): string {
  switch (step.state) {
    case "Rejected":
      return "error.main";
    case "Pending":
      return "warning.main";
    // A status this app does not recognise gets no colour of its own: green or
    // amber would be a claim about where the claim stands that nobody made.
    case "Unknown":
      return "text.secondary";
    default:
      return "success.main";
  }
}

/**
 * Where a claim has got to, as a two-stop trail.
 *
 * `ClaimTable.tsx:227-280` opens this from the status chip, in a right-hand
 * drawer. The source heads it with an illustration; this does not — the trail
 * is two lines and a drawer that spends 220px on a picture before saying
 * anything is a worse answer to "what happened to my claim?".
 */
export function OpdClaimActivityDrawer({
  claim,
  onClose,
}: {
  claim: OpdClaim | null;
  onClose: () => void;
}) {
  const steps = claim ? opdActivitySteps(claim) : [];
  return (
    <Drawer
      open={Boolean(claim)}
      anchor="right"
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 380 }, p: 2.5 } } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 17, fontWeight: 700 }}>Claim Activity</Typography>
        <IconButton size="small" aria-label="Close claim activity" onClick={onClose}>
          <XIcon size={18} />
        </IconButton>
      </Stack>

      {claim && (
        <>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontFamily: "monospace", mb: 2.5 }}>
            {claim.id}
          </Typography>

          <Stack>
            {steps.map((step, i) => (
              <Step key={step.label} step={step} isLast={i === steps.length - 1} />
            ))}
          </Stack>
        </>
      )}
    </Drawer>
  );
}

function Step({ step, isLast }: { step: OpdActivityStep; isLast: boolean }) {
  const tone = toneFor(step);
  const Icon = step.label === "Claim Submission" ? ListChecksIcon : UsersRoundIcon;
  return (
    <Stack direction="row" spacing={1.5} alignItems="stretch">
      {/* The rail: a dot per stop, joined by a line that stops at the last one. */}
      <Stack alignItems="center" sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            // Square, like every other bordered thing on this screen. The
            // source draws a round TimelineDot; a circle here would be the one
            // curve on a page of rectangles.
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: 1,
            borderColor: tone,
            color: tone,
          }}
        >
          <Icon size={17} />
        </Box>
        {/* Decorative: the trail's shape is already carried by the order of
            the steps and by each one's own words. */}
        {!isLast && <Box aria-hidden="true" sx={{ flex: 1, width: "1px", bgcolor: "divider", my: 0.5 }} />}
      </Stack>

      <Box sx={{ pb: isLast ? 0 : 3, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: tone }}>
          {step.label}
          {step.state !== "done" && (
            <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 500 }}>
              {" "}
              {/* An unrecognised status is shown as the backend sent it, the
                  way `opdStatusMeta` does, rather than translated into a word
                  this app made up. */}
              ({step.state === "Unknown" ? (step.rawStatus ?? "Unknown") : step.state})
            </Typography>
          )}
        </Typography>
        {step.date && (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            {historyDate(step.date)}
          </Typography>
        )}
        {step.reason && (
          <Typography sx={{ fontSize: 12.5, mt: 1, overflowWrap: "anywhere" }}>
            <Box component="span" sx={{ fontWeight: 600 }}>
              Reason:
            </Box>{" "}
            {step.reason}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
