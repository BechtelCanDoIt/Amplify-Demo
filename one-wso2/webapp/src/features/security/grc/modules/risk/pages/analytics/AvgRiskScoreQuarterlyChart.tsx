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

import { LineChart } from "@wso2/oxygen-ui-charts-react";
import { Box, Typography } from "@wso2/oxygen-ui";
import type { JSX } from "react";
import type { TrendPoint } from "../../api/riskApi";
import { CHART_ANIMATION_MS } from "../dashboard/constants";
import { AVG_SCORE_COLOR, groupTrendByQuarter } from "./constants";

interface AvgRiskScoreQuarterlyChartProps {
  data: TrendPoint[];
}

const CHART_HEIGHT = 280;

// "Avg. Risk Score by Quarter": TrendChart's monthly avg_score rebucketed
// into calendar quarters, so the same residual-score trend reads at a
// coarser, less noisy granularity. A quarter with no identified risks keeps
// its x-axis slot with a null score (a gap in the line via connectNulls)
// rather than being dropped, which would otherwise pull its neighboring
// quarters together and draw a line straight across the gap.
export default function AvgRiskScoreQuarterlyChart({ data }: AvgRiskScoreQuarterlyChartProps): JSX.Element {
  const rows = groupTrendByQuarter(data);

  if (rows.every((q) => q.avg_score === null)) {
    return (
      <Typography variant="body2" color="text.secondary">
        No risk activity in the last 12 months.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5 }}>
      {/* Custom axis title, centered on the whole chart height (line + legend)
          rather than recharts' internal "insideLeft" label, which gets
          clipped when the left margin is too tight to fit it. */}
      <Box
        sx={{
          height: CHART_HEIGHT,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Avg. Risk Score
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <LineChart
          data={rows}
          xAxisDataKey="quarter"
          lines={[
            {
              dataKey: "avg_score",
              name: "Avg. Risk Score",
              stroke: AVG_SCORE_COLOR,
              strokeWidth: 2,
              dot: { r: 3 },
              connectNulls: true,
            },
          ]}
          height={CHART_HEIGHT}
          animationDuration={CHART_ANIMATION_MS}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          xAxis={{ show: true, name: "Quarter" }}
          yAxis={{ show: true }}
          legend={{ show: true, align: "center", verticalAlign: "bottom" }}
        />
      </Box>
    </Box>
  );
}
