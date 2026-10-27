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
import { Box, Paper, Typography } from "@wso2/oxygen-ui";
import type { TilSubmission } from "../api/tilTypes";
import { entryLinkProps } from "../util/tilEntryLink";
import { tilLineClamp } from "../util/tilFormat";
import { tilExcerpt } from "../util/tilRichText";
import SubmissionActions, { type SubmissionActionProps } from "./SubmissionActions";
import TilEntryByline from "./TilEntryByline";
import TilEntryCover from "./TilEntryCover";
import TilSourceLabel from "./TilSourceLabel";

// One entry in the Large thumbnails layout: a wide source cover over the
// title, three lines of the learning and the byline. Edit and delete sit on
// the cover, shown on hover or keyboard focus, and always on touch screens.
export default function SubmissionTile({
  submission,
  onOpen,
  ...actions
}: SubmissionActionProps & { submission: TilSubmission; onOpen: () => void }) {
  return (
    <Paper
      variant="outlined"
      {...entryLinkProps(onOpen)}
      sx={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": { borderColor: "text.secondary" },
        "& .til-tile-actions": { opacity: 0, transition: "opacity 150ms" },
        "&:hover .til-tile-actions, &:focus-within .til-tile-actions": { opacity: 1 },
        "@media (hover: none)": { "& .til-tile-actions": { opacity: 1 } },
      }}
    >
      <Box sx={{ position: "relative", aspectRatio: "16 / 9" }}>
        <TilEntryCover submission={submission} iconSize={44} />
        <SubmissionActions
          className="til-tile-actions"
          // background.default, not paper: the dark theme's paper is a
          // translucent dimming, which would let the cover show through.
          sx={{ position: "absolute", top: 8, right: 8, p: 0.25, borderRadius: 999, bgcolor: "background.default", boxShadow: 1 }}
          {...actions}
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, p: 2 }}>
        <TilSourceLabel submission={submission} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3, ...tilLineClamp(2) }}>
          {submission.title || "Untitled entry"}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: "break-word", whiteSpace: "pre-line", ...tilLineClamp(3) }}
        >
          {tilExcerpt(submission.what)}
        </Typography>
        {/* Pinned to the bottom so bylines line up across a row of tiles. */}
        <TilEntryByline submission={submission} avatar sx={{ mt: "auto", pt: 1 }} />
      </Box>
    </Paper>
  );
}
