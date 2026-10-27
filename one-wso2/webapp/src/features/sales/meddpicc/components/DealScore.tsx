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

import { alpha, Box, Typography } from "@wso2/oxygen-ui";
import { bandColor, formatScore, scoreBand } from "../util/dealScore";

/**
 * Salesforce's deal score as a small badge: the number in a ring of its band's colour, and
 * the band's name. A deal Salesforce has no score for shows a dash.
 */
export default function DealScore({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return (
      <Typography variant="body2" color="text.disabled" role="img" aria-label="No opportunity score">
        —
      </Typography>
    );
  }
  const band = scoreBand(score);
  const color = bandColor(band);
  return (
    <Box
      role="img"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
      aria-label={`Opportunity score ${formatScore(score)}, ${band}`}
      title={`Salesforce opportunity score: ${formatScore(score)} (${band})`}
    >
      <Box
        sx={(theme) => ({
          minWidth: 38,
          height: 24,
          px: 0.75,
          borderRadius: "12px",
          border: 1.5,
          borderColor: `${color}.main`,
          bgcolor: alpha(theme.palette[color].main, 0.08),
          color: `${color}.dark`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          fontWeight: 700,
        })}
        aria-hidden
      >
        {formatScore(score)}
      </Box>
      <Typography variant="caption" sx={{ color: `${color}.dark`, fontWeight: 600 }} aria-hidden>
        {band}
      </Typography>
    </Box>
  );
}
