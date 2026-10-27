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
import { Box, Chip, Paper, Typography } from "@wso2/oxygen-ui";
import type { TilSubmission } from "../api/tilTypes";
import { entryLinkProps } from "../util/tilEntryLink";
import { tilExcerpt } from "../util/tilRichText";
import SubmissionActions from "./SubmissionActions";

// One entry in the history feed, in the Cards layout.
//
// Shows a plain-text EXCERPT of `what`, not the full rich content — a long
// multi-paragraph/list entry made the feed itself unreadable (one card
// could run to a dozen visible lines). Each paragraph still starts its own
// line within the three-line clamp, so the preview keeps the entry's shape.
// The full rich version still renders in full on the entry's own page
// (TilWhatContent, via onOpen below).
export default function SubmissionCard({
  submission,
  canEdit,
  onEdit,
  canDelete,
  onDelete,
  deleting,
  onOpen,
}: {
  submission: TilSubmission;
  canEdit: boolean;
  onEdit: () => void;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
  /** Present only in the feed list — clicking the card opens its own page.
   * Omitted when SubmissionCard is reused BY that same page (TilEntryPage),
   * where "open this entry" would just mean reloading the page you're on. */
  onOpen?: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      {...(onOpen && entryLinkProps(onOpen))}
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        ...(onOpen && {
          cursor: "pointer",
          "&:hover": { borderColor: "text.secondary" },
        }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          {/* Old entries predate the title field (backend default: "") --
              falling back to the who/where line alone for those, rather
              than showing an empty heading above it. */}
          {submission.title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {submission.title}
            </Typography>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: submission.title ? 0.25 : 0 }}>
            <Typography
              variant={submission.title ? "caption" : "subtitle2"}
              color={submission.title ? "text.secondary" : "text.primary"}
              sx={submission.title ? undefined : { fontWeight: 700 }}
              noWrap
            >
              Authored by {submission.who}
            </Typography>
            <Chip
              label={submission.whereDetail ? `${submission.where} — ${submission.whereDetail}` : submission.where}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
        <SubmissionActions
          canEdit={canEdit}
          onEdit={onEdit}
          canDelete={canDelete}
          onDelete={onDelete}
          deleting={deleting}
        />
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          wordBreak: "break-word",
          whiteSpace: "pre-line",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {tilExcerpt(submission.what)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {submission.createdAt.toLocaleString()}
        {submission.updatedAt && " · Edited"}
      </Typography>
    </Paper>
  );
}
