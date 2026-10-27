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
import type { TilSubmission } from "../api/tilTypes";
import { entryLinkProps } from "../util/tilEntryLink";
import { tilShortDate } from "../util/tilFormat";
import { tilSourceColors } from "../util/tilSourceTones";
import SubmissionActions, { type SubmissionActionProps } from "./SubmissionActions";

// One entry in the List layout: source, title, author and date on one line.
// Narrows by the feed's own width (a container query), not the window's, since
// the side rail takes a different share of it open or collapsed. Edit and
// delete show on hover or keyboard focus, and always on touch screens.
export default function SubmissionRow({
  submission,
  onOpen,
  ...actions
}: SubmissionActionProps & { submission: TilSubmission; onOpen: () => void }) {
  const date = tilShortDate(submission.createdAt);
  return (
    <Box
      {...entryLinkProps(onOpen)}
      sx={{
        display: "grid",
        gridTemplateColumns: "120px minmax(0, 1fr) 160px 104px 64px",
        alignItems: "center",
        columnGap: 2,
        minHeight: 44,
        px: 2,
        py: 0.5,
        cursor: "pointer",
        "& + &": { borderTop: 1, borderColor: "divider" },
        "&:hover": { bgcolor: "action.hover" },
        "& .til-row-actions": { justifySelf: "end", opacity: 0 },
        "&:hover .til-row-actions, &:focus-within .til-row-actions": { opacity: 1 },
        "@media (hover: none)": { "& .til-row-actions": { opacity: 1 } },
        "& .til-row-compact": { display: "none" },
        "@container (max-width: 760px)": {
          gridTemplateColumns: "112px minmax(0, 1fr) 104px 64px",
          "& .til-row-who": { display: "none" },
        },
        "@container (max-width: 520px)": {
          gridTemplateColumns: "minmax(0, 1fr) auto",
          py: 1,
          "& .til-row-source, & .til-row-who, & .til-row-date": { display: "none" },
          "& .til-row-compact": { display: "block" },
          "& .til-row-actions": { gridRow: "1 / span 2", gridColumn: 2, opacity: 1 },
        },
      }}
    >
      <Box className="til-row-source" sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Box
          aria-hidden
          sx={[
            { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: "currentColor" },
            tilSourceColors(submission.where, false),
          ]}
        />
        <Typography variant="body2" color="text.secondary" noWrap>
          {submission.where}
        </Typography>
      </Box>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {submission.title || "Untitled entry"}
        {submission.updatedAt && (
          <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 400, color: "text.secondary" }}>
            Edited
          </Box>
        )}
      </Typography>
      <Typography className="til-row-compact" variant="caption" color="text.secondary" noWrap>
        {submission.where} · {submission.who} · {date}
      </Typography>
      <Typography className="til-row-who" variant="body2" color="text.secondary" noWrap>
        {submission.who}
      </Typography>
      <Typography
        className="til-row-date"
        variant="body2"
        color="text.secondary"
        noWrap
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {date}
      </Typography>
      <SubmissionActions className="til-row-actions" {...actions} />
    </Box>
  );
}
