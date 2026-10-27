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

// Ports promotion-app's own PromotionTimeline (component/promotion/timeline.tsx)
// almost verbatim: source is @mui/lab's `Timeline position="alternate"` — a
// two-column layout where each row's "opposite content" (the cycle name / join
// date) sits on whichever side the row's content ISN'T, alternating every row.
//
// @mui/lab has no stable release for this app's MUI major version (checked:
// the npm registry's newest @mui/lab compatible with material v7 is still a
// beta), so this hand-rolls the same alternating grid + dot/connector spine
// with plain Box/Grid rather than pulling in a pre-release dependency. Visual
// result — column split, dot colours, connector, alternating sides — matches
// source; only the implementation is different.
import type { ReactNode } from "react";
import { Box, Chip, SvgIcon, Typography } from "@wso2/oxygen-ui";
import type { PromotionEmployeeInfoWithLead, PromotionHistoryEntry } from "../api/types";
import { formatDate, sortPromotionsByBand } from "../util/promotionHistory";

const StarsIcon = () => (
  <SvgIcon sx={{ fontSize: 20, color: "#fff" }}>
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2m4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23z" />
  </SvgIcon>
);

const BadgeIcon = () => (
  <SvgIcon sx={{ fontSize: 20, color: "#fff" }}>
    <path d="M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2M9 12c.83 0 1.5.67 1.5 1.5S9.83 15 9 15s-1.5-.67-1.5-1.5S8.17 12 9 12m3 6H6v-.75c0-1 2-1.5 3-1.5s3 .5 3 1.5zm1-9h-2V4h2zm5 7.5h-4V15h4zm0-3h-4V12h4z" />
  </SvgIcon>
);

interface Row {
  key: string | number;
  tone: "primary" | "warning" | "inherit";
  Icon: () => ReactNode;
  opposite: string;
  content: ReactNode;
}

export default function PromotionTimeline({
  employeeInfo,
  requests,
}: {
  employeeInfo: PromotionEmployeeInfoWithLead;
  requests: PromotionHistoryEntry[];
}) {
  const sorted = sortPromotionsByBand(requests);

  const promotionRows: Row[] = sorted.map((entry) => ({
    key: entry.id,
    // "secondary" would match source's TimelineDot color literally, but this
    // app's theme leaves secondary too pale to read against the card
    // background — warning is the same distinguishing role the My-page
    // history dialog already uses for a SPECIAL chip (PromotionHistoryDialog's
    // own TypeChip), so this reuses that instead of inventing a new mapping.
    tone: entry.promotionType === "SPECIAL" ? "warning" : "primary",
    Icon: StarsIcon,
    opposite: entry.promotionCycle,
    content: (
      <>
        {entry.promotionType === "SPECIAL" && (
          <Chip label="Special" size="small" color="warning" variant="outlined" sx={{ mb: 0.5 }} />
        )}
        <Typography variant="overline" color="text.secondary" component="div" sx={{ lineHeight: 1.5 }}>
          Promoted to
        </Typography>
        <Typography variant="h6" component="div">
          {entry.promotedJobRole ? `${entry.promotedJobRole} / JB ${entry.nextJobBand}` : `JB ${entry.nextJobBand}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {entry.promotedDate && (
            <>
              Promoted on {formatDate(entry.promotedDate)}
              <br />
            </>
          )}
          BU: {entry.businessUnit}
          <br />
          Dept: {entry.department}
          <br />
          Team: {entry.team}
        </Typography>
      </>
    ),
  }));

  // The "Joined" node's band is the one held before any promotion on
  // record — source's own fallback (timeline.tsx:147-151): the oldest
  // approved request's currentJobBand when there's history, else
  // employee-info's own (current) jobBand for someone never promoted.
  const joinedBand = sorted.length > 0 ? sorted[sorted.length - 1].currentJobBand : employeeInfo.jobBand;
  const joinedRow: Row = {
    key: "joined",
    tone: "inherit",
    Icon: BadgeIcon,
    opposite: formatDate(employeeInfo.startDate),
    content: (
      <>
        <Typography variant="h6" component="div">
          Joined in JB: {joinedBand ?? "-"}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          BU: {employeeInfo.joinedBusinessUnit || "-"}
          <br />
          Dept: {employeeInfo.joinedDepartment || "-"}
          <br />
          Team: {employeeInfo.joinedTeam || "-"}
        </Typography>
      </>
    ),
  };

  // Promotions (already sorted newest-band-first, see sortPromotionsByBand),
  // then the initial/joined node last — matching timeline.tsx's own row
  // order exactly (the DOM order is what determines which node renders at
  // the top vs. the bottom, regardless of layout).
  const rows = [...promotionRows, joinedRow];

  return (
    <Box>
      {rows.map((row, i) => (
        <TimelineRow key={row.key} row={row} last={i === rows.length - 1} alternateLeft={i % 2 === 0} />
      ))}
    </Box>
  );
}

// One row of the alternating grid: opposite-content column, dot+connector
// spine, main-content column — swapping which side holds which every other
// row, same as @mui/lab's `position="alternate"`.
function TimelineRow({ row, last, alternateLeft }: { row: Row; last: boolean; alternateLeft: boolean }) {
  const oppositeCell = (
    <Box sx={{ textAlign: alternateLeft ? "right" : "left", py: "12px", px: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {row.opposite}
      </Typography>
    </Box>
  );
  const contentCell = (
    <Box sx={{ textAlign: alternateLeft ? "left" : "right", py: "12px", px: 2 }}>{row.content}</Box>
  );

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", alignItems: "stretch" }}>
      {alternateLeft ? oppositeCell : contentCell}
      <Spine tone={row.tone} Icon={row.Icon} last={last} />
      {alternateLeft ? contentCell : oppositeCell}
    </Box>
  );
}

// The dot + connector column — a filled circle in the row's colour, with a
// line running through it connecting to the row above and below (source's
// TimelineSeparator/TimelineConnector/TimelineDot). The first row has nothing
// above to connect to and the last nothing below, but both still render a
// connector to keep every dot the same visual weight source's own timeline
// has (source always renders both TimelineConnectors regardless of position).
function Spine({ tone, Icon, last }: { tone: Row["tone"]; Icon: Row["Icon"]; last: boolean }) {
  const color = tone === "inherit" ? "grey.600" : `${tone}.main`;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box sx={{ width: 2, flex: 1, minHeight: 12, bgcolor: "divider" }} />
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: color,
          boxShadow: 2,
          flexShrink: 0,
          my: 0.5,
        }}
      >
        <Icon />
      </Box>
      {!last && <Box sx={{ width: 2, flex: 1, minHeight: 12, bgcolor: "divider" }} />}
    </Box>
  );
}
