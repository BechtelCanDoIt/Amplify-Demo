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
import { Box, Button, Paper, Stack, Typography } from "@wso2/oxygen-ui";
import { ExternalLinkIcon } from "@wso2/oxygen-ui-icons-react";
import { newTabNote } from "../util/libraryPreviewNote";
import { KIND_NAME, type Passage, type ResultGroup } from "../util/libraryResults";
import { KIND_ICON } from "./kindIcon";

interface PreviewPanelProps {
  readonly group: ResultGroup;
  /** The passage being previewed. */
  readonly passage: Passage;
}

/**
 * The selected result. Google Docs, Slides and Sheets are framed in the page; anything else says how it will open.
 * A frame is never built from the link as given: see embedUrlFor.
 */
export default function PreviewPanel({ group, passage }: PreviewPanelProps): JSX.Element {
  const Icon = KIND_ICON[group.kind];
  const heading = `${KIND_NAME[group.kind]}${passage.location ? ` · ${passage.location}` : ""}`;

  return (
    <Paper variant="outlined" aria-label="Preview" component="aside" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", p: 2, borderBottom: 1, borderColor: "divider", flexWrap: "wrap", columnGap: 1.5, rowGap: 1 }}
      >
        <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
          <Typography variant="subtitle2">{group.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {heading}
          </Typography>
        </Box>
        {passage.openUrl ? (
          <Button
            component="a"
            href={passage.openUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size="small"
            endIcon={<ExternalLinkIcon size={14} />}
          >
            {/* Only a deep link can open at a spot: Drive opens a whole PDF, and a web page has no slide. */}
            {passage.source.nativeLink && passage.location ? `Open at ${passage.location}` : "Open"}
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No link to open
          </Typography>
        )}
      </Stack>

      <Box sx={{ bgcolor: "action.hover", minHeight: 360, display: "flex", alignItems: "stretch" }}>
        {passage.embedUrl ? (
          <Box
            component="iframe"
            title={`Preview of ${group.title}`}
            src={passage.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
            sx={{ border: 0, width: "100%", minHeight: 360 }}
          />
        ) : (
          <Stack spacing={1.5} sx={{ m: "auto", p: 3, maxWidth: 340, alignItems: "center", textAlign: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: 1,
                borderColor: "divider",
                color: "text.secondary",
              }}
            >
              <Icon size={24} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {newTabNote(group.kind, passage.location)}
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
