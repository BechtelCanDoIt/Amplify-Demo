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

import { alpha, Box, Paper, Skeleton, Typography } from "@wso2/oxygen-ui";
import type { LucideIcon } from "@wso2/oxygen-ui-icons-react";
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  FileTextIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "@wso2/oxygen-ui-icons-react";
import type { PromotionRequestFull, PromotionRequestStatus } from "../api/types";

function count(data: PromotionRequestFull[], statuses: PromotionRequestStatus[]): number {
  return data.filter((r) => statuses.includes(r.status)).length;
}

type Tone = "primary" | "success" | "error" | "warning" | "info";

// A soft tint of the tone's own `.main`, computed via `alpha()` rather than
// a `.50`/`.100` shade token — several Oxygen presets (e.g. High Contrast)
// define a semantic color with only `main`/`contrastText`, so a literal
// ".50" silently renders no background at all. `.main` always exists.
function Tile({ icon: Icon, tone, value, label }: { icon: LucideIcon; tone: Tone; value: number; label: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          bgcolor: (theme) => alpha(theme.palette[tone].main, 0.12),
          color: `${tone}.main`,
        }}
      >
        <Icon size={16} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, flex: "1 1 280px", minWidth: 280 }}>
      <Typography
        variant="caption"
        sx={{ display: "block", fontWeight: 700, mb: 2, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 2.5, columnGap: 1.5 }}>{children}</Box>
    </Paper>
  );
}

// Ports promotion-app's own component/statistics/promotionCycle/endStat.tsx
// — three breakdowns of the same request list, from each stage's own point
// of view (Promotion Board / Functional Lead / overall). CloseStat, the
// sibling component source also imports here, is never actually rendered
// in source's own JSX (confirmed dead code) and isn't ported.
export default function PromotionCycleStatsPanel({
  loading,
  data,
}: {
  loading: boolean;
  data: PromotionRequestFull[];
}) {
  if (loading) return <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
      <Section title="Promotion Board Stats">
        <Tile icon={FileTextIcon} tone="primary" value={count(data, ["APPROVED", "REJECTED", "FL_APPROVED"])} label="Total Requests" />
        <Tile icon={ClockIcon} tone="warning" value={count(data, ["FL_APPROVED"])} label="Pending Applications" />
        <Tile icon={CheckIcon} tone="success" value={count(data, ["APPROVED"])} label="Approved Applications" />
        <Tile icon={XIcon} tone="error" value={count(data, ["REJECTED"])} label="Rejected Applications" />
      </Section>
      <Section title="Functional Lead Stats">
        <Tile
          icon={FileTextIcon}
          tone="primary"
          value={count(data, ["SUBMITTED", "FL_REJECTED", "FL_APPROVED", "APPROVED", "REJECTED"])}
          label="Total Requests"
        />
        <Tile icon={ClockIcon} tone="warning" value={count(data, ["SUBMITTED"])} label="Pending Applications" />
        <Tile icon={CheckIcon} tone="success" value={count(data, ["FL_APPROVED", "APPROVED", "REJECTED"])} label="Approved Applications" />
        <Tile icon={XIcon} tone="error" value={count(data, ["FL_REJECTED"])} label="Rejected Applications" />
      </Section>
      <Section title="Stats">
        <Tile icon={FileTextIcon} tone="primary" value={data.length} label="Total Requests" />
        <Tile icon={SendIcon} tone="info" value={count(data, ["SUBMITTED", "FL_REJECTED", "FL_APPROVED", "REJECTED", "APPROVED"])} label="Submitted Applications" />
        <Tile icon={CopyIcon} tone="warning" value={count(data, ["DRAFT"])} label="Pending Applications" />
        <Tile icon={Trash2Icon} tone="error" value={count(data, ["REMOVED"])} label="Removed Applications" />
      </Section>
    </Box>
  );
}
