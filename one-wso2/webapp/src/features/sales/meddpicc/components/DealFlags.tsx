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

import { alpha, Box, Stack, Tooltip, Typography } from "@wso2/oxygen-ui";
import { FlagIcon } from "@wso2/oxygen-ui-icons-react";
import type { DealFlag } from "../types";

/**
 * What needs attention on the deal, at the top of its page: each flag's title, why, and
 * the next step. The flags are rules (the deal has gone quiet, sat in its stage, or is
 * closing with gaps), so each says exactly what tripped it.
 */
export function DealFlags({ flags }: { flags: DealFlag[] | undefined }) {
  if (!flags || flags.length === 0) return null;
  return (
    <Box
      component="section"
      aria-label="Needs attention"
      sx={(theme) => ({
        border: 1,
        borderColor: "warning.light",
        borderRadius: "10px",
        bgcolor: alpha(theme.palette.warning.main, 0.06),
        px: 1.75,
        py: 1.25,
      })}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.75, color: "warning.dark" }}>
        <FlagIcon size={14} aria-hidden />
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
          Needs attention
        </Typography>
      </Stack>
      <Stack component="ul" spacing={1} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {flags.map((flag) => (
          <Box component="li" key={flag.code}>
            <Typography variant="body2">
              <Box component="span" sx={{ fontWeight: 700 }}>
                {flag.title}.
              </Box>{" "}
              {flag.detail}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              <Box component="span" sx={{ fontWeight: 600 }}>
                Next step:
              </Box>{" "}
              {flag.nextStep}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/** A deal's flags on its list row: a flag and the count, the titles on hover. */
export function DealFlagMarker({ flags }: { flags: DealFlag[] | undefined }) {
  if (!flags || flags.length === 0) return null;
  return (
    <Tooltip
      arrow
      describeChild
      title={
        <Box>
          {flags.map((f) => (
            <Typography key={f.code} variant="caption" component="div">
              <strong>{f.title}.</strong> {f.detail}
            </Typography>
          ))}
        </Box>
      }
    >
      {/* Focusable so a keyboard reaches the details too: named by the flags' titles, the
          details read as its description from the tooltip. */}
      <Box
        component="span"
        role="button"
        tabIndex={0}
        aria-label={`Needs attention: ${flags.map((f) => f.title).join(", ")}`}
        onClick={(event) => event.stopPropagation()}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          color: "warning.dark",
          fontWeight: 700,
          fontSize: "0.75rem",
          borderRadius: "4px",
          cursor: "default",
          "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineStyle: "solid", outlineOffset: 1 },
        }}
      >
        <FlagIcon size={12} aria-hidden />
        {flags.length}
      </Box>
    </Tooltip>
  );
}
