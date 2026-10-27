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

import type { JSX, ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@wso2/oxygen-ui";

interface SectionCardProps {
  readonly title: string;
  readonly icon: ReactNode;
  /** Shown on the right of the heading, e.g. a count or a note. */
  readonly aside?: ReactNode;
  readonly children: ReactNode;
  /** The section's accessible name when it should differ from the title. */
  readonly label?: string;
  /** Fills its grid cell, so a footer (`mt: "auto"`) lines up with its neighbours'. */
  readonly stretch?: boolean;
}

/**
 * A titled card: icon badge, title, optional aside, content. The app-wide
 * section style, introduced by the quote sheet and shared since F5.
 */
export default function SectionCard({ title, icon, aside, children, label, stretch = false }: SectionCardProps): JSX.Element {
  return (
    <Paper
      component="section"
      aria-label={label ?? title}
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, minWidth: 0, ...(stretch ? { display: "flex", flexDirection: "column" } : {}) }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: "grid",
            placeItems: "center",
            color: "primary.main",
            bgcolor: "action.selected",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {title}
        </Typography>
        {aside}
      </Stack>
      {children}
    </Paper>
  );
}

/** A labelled value in a grid of facts; "Not set yet" when empty. */
export function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }): JSX.Element {
  const empty = value === null || value === undefined || value === "";
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6, display: "block" }}>
        {label}
      </Typography>
      {empty ? (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
          Not set yet
        </Typography>
      ) : (
        <Typography variant="body1" component="div" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
          {value}
        </Typography>
      )}
      {hint ? (
        <Typography variant="caption" color="text.secondary" component="div">
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

/** A responsive grid for Facts. */
export function FactGrid({ children, min = 200 }: { children: ReactNode; min?: number }): JSX.Element {
  return <Box sx={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 2.5 }}>{children}</Box>;
}
