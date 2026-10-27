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
import type { MonthRegisterCount } from "../../api/riskApi";
import { CHART_ANIMATION_MS, buildRegisterColorMap } from "../dashboard/constants";
import { groupRegisterTrendByQuarter } from "./constants";

interface AvgRisksByRegisterChartProps {
  data: MonthRegisterCount[];
  quarterOrder: string[];
  emptyMessage: string;
}

const CHART_HEIGHT = 320;

// "Avg. Risk by Register": RegisterTrendChart's monthly-per-register counts
// rebucketed into calendar quarters (averaging the up-to-3 months in each
// quarter), with one line per register so registers stay comparable against
// each other across time instead of collapsing to a single all-time figure.
export default function AvgRisksByRegisterChart({
  data,
  quarterOrder,
  emptyMessage,
}: AvgRisksByRegisterChartProps): JSX.Element {
  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  const { rows, registers } = groupRegisterTrendByQuarter(data, quarterOrder);
  const colorMap = buildRegisterColorMap(registers);
  const lines = registers.map((register) => ({
    dataKey: register,
    name: register,
    stroke: colorMap.get(register)!,
    strokeWidth: 2,
    dot: { r: 3 },
    connectNulls: true,
  }));

  return (
    <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5 }}>
      {/* Custom axis title, centered on the whole chart height (lines + legend)
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
          Avg. Risk
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <LineChart
          data={rows}
          xAxisDataKey="quarter"
          lines={lines}
          height={CHART_HEIGHT}
          animationDuration={CHART_ANIMATION_MS}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          yAxis={{ show: true }}
          legend={{ show: true, align: "center", verticalAlign: "bottom" }}
        />
      </Box>
    </Box>
  );
}
