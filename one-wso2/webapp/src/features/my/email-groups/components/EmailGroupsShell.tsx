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
import type { ReactNode } from "react";
import { Alert, Box, Typography } from "@wso2/oxygen-ui";

// Shrinks an element to a 1x1px clipped box instead of hiding it outright —
// unlike display:none/visibility:hidden, this keeps it in the accessibility
// tree, so assistive tech still sees it while sighted users don't. Same
// pattern as OrgChartShell.
// Page frame: eyebrow chip, title, subtitle, and the one place the "backend
// not connected" state is rendered. Same shape as MenuShell/FinanceShell —
// see MenuShell's comment for why each feature carries its own copy rather
// than sharing one: small enough that a shared abstraction would cost more
// to thread props through than it saves.
export default function EmailGroupsShell({
  title,
  subtitle,
  configured,
  configKey,
  children,
}: {
  title: string;
  subtitle?: string;
  configured: boolean;
  configKey: string;
  children: ReactNode;
}) {
  return (
    <Box>
      {/* A real, VISIBLE h1. This used to be visually hidden with a Chip above
          it carrying the same words — the duplicate was real, but hiding the
          heading fixed the wrong half of it. The rail is collapsible, and
          collapsing sets every label to `opacity: 0; width: 0`, so with it
          collapsed this title is the only text naming where you are. The chip
          was the redundant half, and it is gone.

          A parent chip earns its place only above a title that would not
          identify the screen alone — "Dashboard", "History", "Settings". */}
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
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
