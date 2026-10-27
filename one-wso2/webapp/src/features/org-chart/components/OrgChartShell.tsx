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

// Page frame for the org chart: eyebrow chip, title, subtitle, and the one
// place the "backend not connected" state is rendered. Same arrangement as
// MenuShell / the finance shell — each feature owns its own copy of this.

import type { ReactNode } from "react";
import { Alert, Box, Typography } from "@wso2/oxygen-ui";

// Shrinks an element to a 1x1px clipped box instead of hiding it outright —
// unlike display:none/visibility:hidden, this keeps it in the accessibility
// tree, so assistive tech still sees it while sighted users don't.
export default function OrgChartShell({
  title,
  subtitle,
  configured,
  configKey,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  configured: boolean;
  configKey: string;
  /** Rendered top-right, alongside the title — e.g. the Download button.
   *  Only shown once the backend is configured; there's nothing to act on
   *  in the not-connected state. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          {/* A real, VISIBLE h1. This used to be visually hidden with a Chip
              above it saying "Org Chart" over a title of "Org chart" — the same
              two words, disagreeing on capitalisation. The duplicate was real,
              but hiding the heading fixed the wrong half: the rail is
              collapsible, and collapsing sets every label to
              `opacity: 0; width: 0`, so with it collapsed this title is the
              only text naming where you are.

              No chip now. Org Chart is a bare section under People Ops, not a
              screen inside an app, so there was never an app name to put above
              the title — and "Org chart" identifies itself. */}
          <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
        </Box>
        {configured && action && <Box sx={{ flexShrink: 0, mt: 0.5 }}>{action}</Box>}
      </Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
          {subtitle}
        </Typography>
      )}

      {configured ? (
        children
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          This app isn&apos;t connected yet. Set <code>{configKey}</code> in{" "}
          <code>public/config.js</code> (the backend URL) and reload.
        </Alert>
      )}
    </Box>
  );
}
