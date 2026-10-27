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

import { useEffect, useState, type JSX, type ReactNode } from "react";
import { Box, CircularProgress, Paper, Stack, Typography } from "@wso2/oxygen-ui";
import { CircleAlertIcon, CircleCheckIcon, CloudDownloadIcon } from "@wso2/oxygen-ui-icons-react";

export interface Finding {
  readonly key: string;
  readonly label: string;
  readonly value: ReactNode;
  /** A problem only Salesforce can fix, shown as a warning line. */
  readonly warning?: boolean;
}

interface SalesforceFindingsProps {
  /** e.g. "About this account"; shown once everything has arrived. */
  readonly title: string;
  /** True while the Salesforce lookups are still running. */
  readonly loading: boolean;
  readonly findings: readonly Finding[];
  /** Tick the lines in one by one; false shows them at once (a saved draft). */
  readonly animate: boolean;
  /** Called once every line is showing. */
  readonly onDone?: () => void;
}

/** Time between two lines ticking in. */
export const FINDING_STEP_MS = 250;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

/**
 * What the wizard found in Salesforce, shown as it arrives (2026-09-28):
 *
 *   ⟳ Pulling from Salesforce…        ← while the lookups run
 *   ✓ Account        Northwind …       ← then one line at a time
 *   ✓ Opportunities  3 found
 *
 * Nothing is shown before it has really arrived: the lines only start once
 * `loading` is false. Mount it with a `key` per record so a new choice replays it.
 */
export default function SalesforceFindings({ title, loading, findings, animate, onDone }: SalesforceFindingsProps): JSX.Element {
  const instant = !animate || prefersReducedMotion();
  const [shown, setShown] = useState(instant ? findings.length : 0);
  const count = loading ? 0 : instant ? findings.length : Math.min(shown, findings.length);
  const done = !loading && count >= findings.length;

  useEffect(() => {
    if (loading || instant || shown >= findings.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), FINDING_STEP_MS);
    return () => clearTimeout(t);
  }, [loading, instant, shown, findings.length]);

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }} aria-label={title} aria-busy={!done}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: count > 0 ? 1.25 : 0 }}>
        {done ? (
          <Box sx={{ display: "flex", color: "primary.main" }} aria-hidden>
            <CloudDownloadIcon size={16} />
          </Box>
        ) : (
          <CircularProgress size={14} />
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {done ? title : "Pulling from Salesforce…"}
        </Typography>
      </Stack>
      <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: "none" }}>
        {findings.slice(0, count).map((f) => (
          <Stack
            component="li"
            key={f.key}
            direction="row"
            spacing={1.25}
            alignItems="flex-start"
            sx={
              instant
                ? undefined
                : {
                    "@keyframes cpqFindingIn": {
                      from: { opacity: 0, transform: "translateY(4px)" },
                      to: { opacity: 1, transform: "none" },
                    },
                    animation: "cpqFindingIn 220ms ease-out",
                  }
            }
          >
            <Box sx={{ display: "flex", mt: 0.25, color: f.warning ? "warning.main" : "success.main" }} aria-hidden>
              {f.warning ? <CircleAlertIcon size={16} /> : <CircleCheckIcon size={16} />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 136, flexShrink: 0 }}>
              {f.label}
            </Typography>
            <Typography variant="body2" component="div" sx={{ fontWeight: 600, minWidth: 0 }}>
              {f.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
