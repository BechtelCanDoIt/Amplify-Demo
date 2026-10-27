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
import { Avatar, Box, Typography, type SxProps, type Theme } from "@wso2/oxygen-ui";
import type { TilSubmission } from "../api/tilTypes";
import { tilInitials, tilShortDate } from "../util/tilFormat";
import { tilReadingMinutes } from "../util/tilRichText";

// "Alex Sample · Oct 4, 2026 · Edited · 1 min read" under an entry in the
// thumbnail layouts, with the author's initials in front when `avatar` is set.
// Edited sits by the date it qualifies, ahead of the reading time, so a narrow
// tile cuts the reading time first.
export default function TilEntryByline({
  submission,
  avatar = false,
  sx,
}: {
  submission: TilSubmission;
  avatar?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box sx={[{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {avatar && (
        <Avatar aria-hidden sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 600 }}>
          {tilInitials(submission.who)}
        </Avatar>
      )}
      <Typography variant="caption" color="text.secondary" noWrap>
        <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
          {submission.who}
        </Box>
        {` · ${tilShortDate(submission.createdAt)}`}
        {submission.updatedAt && " · Edited"}
        {` · ${tilReadingMinutes(submission.what)} min read`}
      </Typography>
    </Box>
  );
}
