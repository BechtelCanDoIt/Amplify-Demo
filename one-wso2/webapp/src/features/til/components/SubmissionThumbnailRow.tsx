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
import { tilLineClamp } from "../util/tilFormat";
import { tilExcerpt } from "../util/tilRichText";
import SubmissionActions, { type SubmissionActionProps } from "./SubmissionActions";
import TilEntryByline from "./TilEntryByline";
import TilEntryCover from "./TilEntryCover";
import TilSourceLabel from "./TilSourceLabel";

// One entry in the Small thumbnails layout: a small source cover, the
// title, two lines of the learning and the byline. In a narrow feed (a phone,
// where the rail leaves little room) edit and delete move under the text.
export default function SubmissionThumbnailRow({
  submission,
  onOpen,
  ...actions
}: SubmissionActionProps & { submission: TilSubmission; onOpen: () => void }) {
  return (
    <Box
      {...entryLinkProps(onOpen)}
      sx={{
        display: "grid",
        gridTemplateColumns: "128px minmax(0, 1fr) auto",
        columnGap: 2,
        p: 1.75,
        cursor: "pointer",
        "& + &": { borderTop: 1, borderColor: "divider" },
        "&:hover": { bgcolor: "action.hover" },
        "@container (max-width: 520px)": {
          gridTemplateColumns: "72px minmax(0, 1fr)",
          columnGap: 1.5,
          "& .til-thumb": { aspectRatio: "1 / 1" },
          "& .til-thumb-actions": { gridColumn: 2, justifySelf: "start", ml: -0.75 },
        },
      }}
    >
      <Box className="til-thumb" sx={{ alignSelf: "start", aspectRatio: "4 / 3", borderRadius: 1.25, overflow: "hidden" }}>
        <TilEntryCover submission={submission} iconSize={28} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
        <TilSourceLabel submission={submission} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3, ...tilLineClamp(2) }}>
          {submission.title || "Untitled entry"}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: "break-word", whiteSpace: "pre-line", ...tilLineClamp(2) }}
        >
          {tilExcerpt(submission.what)}
        </Typography>
        <TilEntryByline submission={submission} sx={{ mt: 0.5 }} />
      </Box>
      <SubmissionActions className="til-thumb-actions" sx={{ alignSelf: "start" }} {...actions} />
    </Box>
  );
}
