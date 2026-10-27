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

import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import type { JSX } from "react";
import type { CategoryCounts, CommonOpenCategory } from "../../api/riskApi";
import { CountCells, CountHeaderCells, LegendRow, RegisterChip } from "./CategoryCounts";
import { commonOpenStats, spreadColor, type ScopeRegister } from "./categoryViews";
import { OPEN_COLOR } from "./constants";

const KEYS: (keyof CategoryCounts)[] = ["open", "accept", "remediate", "closed"];
const FALLBACK_REGISTER_COLOR = "#6b7280";

interface CommonOpenCategoriesTableProps {
  rows: CommonOpenCategory[];
  registers: ScopeRegister[];
  registerColors: Map<string, string>;
}

function StatCard({ value, label, color }: { value: string; label: string; color?: string }): JSX.Element {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 2, py: 1.5, textAlign: "center" }}>
      <Typography variant="h5" fontWeight={700} sx={{ color }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function SpreadBar({ affected, total }: { affected: number; total: number }): JSX.Element {
  const color = spreadColor(affected, total);
  const pct = total > 0 ? Math.min(100, (affected / total) * 100) : 0;
  return (
    <Box sx={{ minWidth: 80 }}>
      <Box sx={{ height: 8, borderRadius: 1, bgcolor: "action.hover", overflow: "hidden" }}>
        <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: color }} />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {affected}/{total}
      </Typography>
    </Box>
  );
}

// "Common Open Risks Across All Risk Registers": Common Open Categories, most
// widespread first (the service's order).
export default function CommonOpenCategoriesTable({
  rows,
  registers,
  registerColors,
}: CommonOpenCategoriesTableProps): JSX.Element {
  const stats = commonOpenStats(rows, registers);
  const byId = new Map(registers.map((r) => [r.id, r]));
  const colorOf = (r: ScopeRegister): string => registerColors.get(r.name) ?? FALLBACK_REGISTER_COLOR;

  return (
    <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 2 }}>
        <StatCard value={String(stats.totalOpen)} label="Total open risks in category overlap" color={OPEN_COLOR} />
        <StatCard value={stats.mostPervasive ?? "—"} label="Most pervasive category" />
        <StatCard value={String(stats.registersWithNoOverlap)} label="Registers with no overlap" color="#008300" />
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No risk category is currently open in 2 or more registers.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Risk Category</TableCell>
                <TableCell>Registers affected</TableCell>
                <CountHeaderCells keys={KEYS} />
                <TableCell sx={{ width: 110 }}>Spread</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.category_id}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.category_name}</TableCell>
                  <TableCell>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {row.register_ids.map((id) => {
                        const register = byId.get(id);
                        return register ? (
                          <RegisterChip key={id} register={register} color={colorOf(register)} />
                        ) : null;
                      })}
                    </Stack>
                  </TableCell>
                  <CountCells counts={row} keys={KEYS} />
                  <TableCell>
                    <SpreadBar affected={row.register_ids.length} total={registers.length} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <LegendRow
        items={registers.map((r) => (
          <Stack key={r.id} direction="row" alignItems="center" gap={0.75}>
            <RegisterChip register={r} color={colorOf(r)} />
            <Typography variant="body2" color="text.secondary">
              {r.name}
            </Typography>
          </Stack>
        ))}
      />
    </>
  );
}
