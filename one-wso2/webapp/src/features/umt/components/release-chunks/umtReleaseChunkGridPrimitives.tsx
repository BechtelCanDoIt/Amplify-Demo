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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import type { ReactNode } from "react";
import { Box, Chip, CircularProgress, Stack } from "@wso2/oxygen-ui";
import { umtBuildStatusChip } from "../../lib/umtReleaseChunks";
import { CHUNK_CELL_PADDING_X, CHUNK_LINE_HEIGHT } from "./umtReleaseChunkGridSx";

// The outer wrapper for every cell in the release-chunk grids. Its children
// are ChunkLines — one per update level for the per-level columns, a single
// one for a plain value — and it deliberately owns none of the vertical
// spacing around them itself: that spacing comes entirely from each
// ChunkLine's own height, so the gap above the first line and the gap below
// the last line come out equal to the gap between any two lines. A padding
// on ChunkCell instead would add unevenly to just the first and last line
// (more space above the first line's text than below it, and the mirror
// image on the last line) which is exactly the asymmetry this avoids.
//
// `divided` rules between those lines. Once a chunk has more than one update
// level, those rules are what tell the reader which product name goes with
// which build status and which retrigger button. The rule is drawn under
// every line, the last included, so the build-detail columns end on a rule
// rather than trailing off with nothing marking the final entry. Columns that
// aren't per-level — the chunk ID, the update IDs — are left undivided, since
// a rule there would imply an alignment that isn't real.
export function ChunkCell({ children, divided = false }: { children: ReactNode; divided?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        py: 0,
        width: "100%",
        ...(divided && {
          "& > *": { borderBottom: 1, borderColor: "divider" },
        }),
      }}
    >
      {children}
    </Box>
  );
}

// One line inside a ChunkCell — a value, a status chip, a row of action
// buttons, or nothing at all where a level has no action to offer but still
// has to hold its place.
//
// Laying the content out in a flex row is also what stops a lone IconButton
// from being stretched: as the only child of a column-direction Stack it
// filled the cell's width, and since an IconButton is round that turned it
// into a wide ellipse. `minHeight` rather than `height` so a value that wraps
// (a failure reason, a long release message) can still grow.
//
// `boxSizing: border-box` keeps a divided line's height exactly
// CHUNK_LINE_HEIGHT once its border is added, rather than growing by the
// border's width — without it, a divided column (Update Levels, Build
// Status, ...) would drift out of step with an undivided one (Update IDs) by
// a pixel per line as a chunk's update levels stack up.
//
// The negative horizontal margin cancels the cell's own padding so that a
// divided cell's rules run the full width of the cell rather than stopping
// short of its edges; the matching padding puts the content back where it
// belongs.
export function ChunkLine({ children, gap = 0.5 }: { children?: ReactNode; gap?: number }) {
  return (
    <Box
      sx={{
        alignItems: "center",
        boxSizing: "border-box",
        display: "flex",
        gap,
        minHeight: CHUNK_LINE_HEIGHT,
        mx: `-${CHUNK_CELL_PADDING_X}px`,
        px: `${CHUNK_CELL_PADDING_X}px`,
      }}
    >
      {children}
    </Box>
  );
}

// A build-status chip. A build still running carries a small inline spinner:
// without it, a build actively in progress is indistinguishable at a glance
// from one parked in a terminal state, on a grid whose whole job is showing
// what is still moving.
export function BuildStatusChip({ status }: { status?: string | null }) {
  const chip = umtBuildStatusChip(status);
  return (
    <Chip
      label={
        chip.pulsing ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <CircularProgress size={12} thickness={5} color="inherit" />
            <span>{chip.text}</span>
          </Stack>
        ) : (
          chip.text
        )
      }
      size="small"
      variant="outlined"
      sx={{ borderColor: chip.color, color: chip.color, fontSize: 12, fontWeight: 600 }}
    />
  );
}
