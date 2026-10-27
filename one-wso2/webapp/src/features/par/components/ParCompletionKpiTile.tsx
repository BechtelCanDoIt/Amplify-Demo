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

import { Box, LinearProgress, Paper, Typography } from "@wso2/oxygen-ui";
import { completionPercent, completionSeverity } from "../util/parCompletionSeverity";

export default function ParCompletionKpiTile({
  label,
  completed,
  total,
}: {
  label: string;
  completed: number;
  total: number;
}) {
  const percent = completionPercent(completed, total);
  const severity = completionSeverity(percent);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
        {/* Severity lives in the bar below, the same restrained place the
            rest of the app puts it (small chips, icon avatars, a colored
            bar) — never a whole stat number in solid error/warning color,
            which reads as much louder than any other severity indicator in
            this app. */}
        <Typography variant="h4" fontWeight={700} lineHeight={1.1}>
          {Math.round(percent)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {completed} / {total}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
        {label}
      </Typography>
      {/* LeaveBalanceSummary.tsx's own bar (same height/borderRadius) uses
          "primary" for a healthy value and only escalates to warning/error —
          never a plain "success" green, which no other progress bar in the
          app uses as its default color.
          MUI's own determinate track auto-tints itself to a translucent
          wash of whatever `color` is passed, which is all you see at low
          percentages (no filled segment yet) — a plain neutral track,
          colored only where actual progress fills it in, matches how every
          other progress indicator in the app (and Oxygen's own default
          grey track) reads instead. */}
      <LinearProgress
        variant="determinate"
        value={percent}
        color={severity === "success" ? "primary" : severity}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { borderRadius: 3 },
        }}
      />
    </Paper>
  );
}
