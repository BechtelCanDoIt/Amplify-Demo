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
import { Box, Paper, Stack } from "@wso2/oxygen-ui";
import type { TilSubmission } from "../api/tilTypes";
import type { TilFeedLayout } from "../util/tilFeedLayout";
import SubmissionCard from "./SubmissionCard";
import SubmissionRow from "./SubmissionRow";
import SubmissionThumbnailRow from "./SubmissionThumbnailRow";
import SubmissionTile from "./SubmissionTile";

// One page of the feed in the chosen layout.
export default function TilFeed({
  layout,
  submissions,
  canChange,
  deletingId,
  onEdit,
  onDelete,
  onOpen,
}: {
  layout: TilFeedLayout;
  submissions: TilSubmission[];
  /** Edit and delete share one rule, same as the backend's. */
  canChange: (submission: TilSubmission) => boolean;
  deletingId: string | null;
  onEdit: (submission: TilSubmission) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const itemProps = (s: TilSubmission) => ({
    submission: s,
    canEdit: canChange(s),
    onEdit: () => onEdit(s),
    canDelete: canChange(s),
    onDelete: () => onDelete(s.id),
    deleting: deletingId === s.id,
    onOpen: () => onOpen(s.id),
  });

  switch (layout) {
    case "list":
    case "small": {
      const Item = layout === "list" ? SubmissionRow : SubmissionThumbnailRow;
      return (
        // The rows lay themselves out by this box's width (container queries).
        <Paper variant="outlined" sx={{ overflow: "hidden", containerType: "inline-size" }}>
          {submissions.map((s) => (
            <Item key={s.id} {...itemProps(s)} />
          ))}
        </Paper>
      );
    }
    case "large":
      return (
        <Box
          sx={{
            display: "grid",
            // Tiles at least 280px wide, and never more than four to a row:
            // a page of 12 then fills every row at 1, 2, 3 or 4 columns.
            gridTemplateColumns: "repeat(auto-fill, minmax(max(280px, calc((100% - 48px) / 4)), 1fr))",
            gap: 2,
          }}
        >
          {submissions.map((s) => (
            <SubmissionTile key={s.id} {...itemProps(s)} />
          ))}
        </Box>
      );
    default:
      return (
        <Stack spacing={1.5}>
          {submissions.map((s) => (
            <SubmissionCard key={s.id} {...itemProps(s)} />
          ))}
        </Stack>
      );
  }
}
