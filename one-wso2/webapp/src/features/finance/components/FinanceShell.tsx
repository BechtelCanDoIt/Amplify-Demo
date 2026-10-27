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
import { Alert, Box, Chip, Stack, Typography } from "@wso2/oxygen-ui";
import type { LucideIcon } from "@wso2/oxygen-ui-icons-react";

// Shared page frame for the finance screens: an app eyebrow chip, a title +
// subtitle, and one place that renders the "backend not connected" state so
// every screen behaves the same when the app's backend URL isn't set. The
// eyebrow + config-key vary per app (OPD / Credit Card / Expense), so
// they're props rather than baked in like LeaveShell.
export default function FinanceShell({
  eyebrow,
  title,
  subtitle,
  configured,
  configKey,
  fill = false,
  actions,
  children,
}: {
  // Which finance app this screen belongs to (OPD / Credit Card / Expense).
  // Informational, not decorative — the shell is shared across all three.
  eyebrow: { icon: LucideIcon; label: string };
  title: string;
  subtitle?: string;
  configured: boolean;
  configKey: string; // e.g. "ONE_WSO2_OPD_BACKEND_URL"
  /**
   * Something to sit on the TITLE's row, right-aligned, in place of the
   * eyebrow chip — FinanceOverviewPage's section switcher, so far the only
   * caller of this. Replaces the chip rather than sitting beside it: the
   * switcher already says which section is showing, so the chip would just
   * repeat it. Optional and absent for every other screen, which keeps the
   * chip exactly as before.
   */
  actions?: ReactNode;
  /**
   * Give the screen exactly the height left in the page and no more, instead
   * of letting it grow the page.
   *
   * For screens that place something of their own against the bottom edge — a
   * grid whose pagination should sit there, a panel that should scroll inside
   * its own card rather than lengthening the page. `AppLayout` already makes
   * the region around `<Outlet />` a flex column that scrolls
   * (`AppLayout.tsx:119-132`), so a screen only has to claim its share of it;
   * this is a pure CSS chain, with nothing measured and nothing to re-measure
   * when the window changes.
   *
   * Off by default: every other finance screen grows down the page, which is
   * right for a form or a report.
   */
  fill?: boolean;
  children: ReactNode;
}) {
  const fillColumn = { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } as const;
  return (
    <Box sx={fill ? fillColumn : undefined}>
      {/* `actions` absent → the chip alone on its own row, left-aligned, as
          ever. Present → no chip row at all; the switcher rides the TITLE's
          row instead, right-aligned. Never both: the switcher already says
          which section is showing, so the chip would only repeat it. */}
      {!actions && (
        <Stack direction="row" sx={{ mb: 0.5 }}>
          <Chip
            icon={<eyebrow.icon size={14} />}
            label={eyebrow.label}
            color="primary"
            // Outlined, not filled: white-on-orange at chip text sizes is
            // ~3.6:1 and fails WCAG AA. Outlined routes through the a11y
            // overlay, which shifts the label and border to primary.dark in
            // light mode.
            variant="outlined"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          />
        </Stack>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="h5">{title}</Typography>
        {actions}
      </Stack>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
          {subtitle}
        </Typography>
      )}

      {configured ? (
        // The title block above keeps its natural height; whatever is left
        // belongs to the screen.
        fill ? <Box sx={fillColumn}>{children}</Box> : children
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          This app isn't connected yet. Set <code>{configKey}</code> in{" "}
          <code>public/config.js</code> (the backend URL) and reload.
        </Alert>
      )}
    </Box>
  );
}
