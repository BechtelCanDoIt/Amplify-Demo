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

// Pure helpers behind the two category tables (Repeated Category / Common
// Open Category — see RISK_MODULE_DESIGN.md §7). The payload carries only
// registers that have risks; everything here that needs the full register
// list (clean registers, the Spread denominator) takes it as an argument.

import type { CommonOpenCategory, RepeatedCategory, RiskTeam } from "../../api/riskApi";

export interface ScopeRegister {
  id: number;
  name: string;
  // risk_team.code, or the full name when the register has none.
  label: string;
}

// The registers in scope, sorted by name: the dashboard's register list, plus
// any register the payload names that the list lacks (e.g. one deactivated
// while it still holds risks) so its rows are never silently dropped.
// onlyRegisterId narrows to one register when the dashboard is filtered.
export function scopeRegisters(
  teams: RiskTeam[],
  payloadRegisters: { id: number; name: string }[],
  onlyRegisterId = 0,
): ScopeRegister[] {
  const byId = new Map<number, ScopeRegister>();
  for (const t of teams) byId.set(t.id, { id: t.id, name: t.name, label: t.code || t.name });
  for (const r of payloadRegisters) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, name: r.name, label: r.name });
  }
  return [...byId.values()]
    .filter((r) => onlyRegisterId === 0 || r.id === onlyRegisterId)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}

export interface RegisterRepeats {
  register: ScopeRegister;
  // Already sorted by the service: most open first, then category name.
  rows: RepeatedCategory[];
}

// One group per register in scope; a register with no repeats gets rows: [].
export function groupRepeatedByRegister(
  registers: ScopeRegister[],
  rows: RepeatedCategory[],
): RegisterRepeats[] {
  return registers.map((register) => ({
    register,
    rows: rows.filter((r) => r.register_id === register.id),
  }));
}

// "<Register> has the most repeated categories (N)." — ties list every
// register sharing the top count; null when nothing repeats.
export function mostRepeatedSentence(groups: RegisterRepeats[]): string | null {
  const max = Math.max(0, ...groups.map((g) => g.rows.length));
  if (max === 0) return null;
  const top = groups.filter((g) => g.rows.length === max).map((g) => g.register.name);
  if (top.length === 1) return `${top[0]} has the most repeated categories (${max}).`;
  const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(top);
  return `${list} have the most repeated categories (${max} each).`;
}

export interface CommonOpenStats {
  totalOpen: number;
  // Full category name; null when no category is common.
  mostPervasive: string | null;
  registersWithNoOverlap: number;
}

// Rows arrive sorted by the service — most affected registers, then most
// open, then name — so the most pervasive category is simply the first row.
export function commonOpenStats(rows: CommonOpenCategory[], registers: ScopeRegister[]): CommonOpenStats {
  const overlapping = new Set(rows.flatMap((r) => r.register_ids));
  return {
    totalOpen: rows.reduce((sum, r) => sum + r.open, 0),
    mostPervasive: rows[0]?.category_name ?? null,
    registersWithNoOverlap: registers.filter((r) => !overlapping.has(r.id)).length,
  };
}

export const SPREAD_HIGH_COLOR = "#e34948";
export const SPREAD_MEDIUM_COLOR = "#eb6834";
export const SPREAD_LOW_COLOR = "#2a78d6";

// ≥ 75% red, > 25% orange, otherwise blue.
export function spreadColor(affected: number, total: number): string {
  const ratio = total > 0 ? affected / total : 0;
  if (ratio >= 0.75) return SPREAD_HIGH_COLOR;
  if (ratio > 0.25) return SPREAD_MEDIUM_COLOR;
  return SPREAD_LOW_COLOR;
}
