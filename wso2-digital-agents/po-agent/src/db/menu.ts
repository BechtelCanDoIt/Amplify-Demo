// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Opportunistic menu cache. When a Sri Lanka user asks about today's menu, the
// get_menu tool call runs authenticated as that user's session and the result
// is UPSERTed here. Subsequent turns inject the cached menu into the system
// prompt so the model answers without a tool round-trip. No background sync —
// the cache refreshes lazily when it's stale AND a user asks. Single-row
// pattern (id = 1). See RUNBOOK.md for recovery.

import { getPool } from "./client";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { config } from "../config";
import type { MenuResult } from "../tools/menu";

export interface MenuCache {
  menu: MenuResult;
  syncedAt: Date;
}

export async function saveMenuCache(menu: MenuResult): Promise<void> {
  const pool = getPool();
  await pool.execute<ResultSetHeader>(
    `INSERT INTO agent_menu_cache (id, menu_json, synced_at)
     VALUES (1, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       menu_json = VALUES(menu_json),
       synced_at = VALUES(synced_at)`,
    [JSON.stringify(menu)]
  );
}

export async function getLatestMenuCache(): Promise<MenuCache | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT menu_json, synced_at FROM agent_menu_cache WHERE id = 1`
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  // mysql2 may return JSON columns as either parsed objects or strings depending on driver config
  const menu = typeof r.menu_json === "string" ? (JSON.parse(r.menu_json) as MenuResult) : (r.menu_json as MenuResult);
  return { menu, syncedAt: r.synced_at };
}

// Today's date in Colombo timezone (matches the menu backend's day boundary).
// `en-CA` locale formats as YYYY-MM-DD, which is the format the backend returns.
function todayInColombo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

// Returns the cached menu iff BOTH: (a) it was refreshed within MENU_CACHE_TTL,
// AND (b) its date field matches today's date in Colombo. The date check is
// the day-boundary guard — a cache saved at 23:59 local shouldn't serve
// yesterday's menu to a caller at 00:05 the next day, even though the TTL
// hasn't elapsed. Returns null on any staleness reason so the caller falls
// through to the live get_menu path.
export async function getFreshMenuCache(): Promise<MenuResult | null> {
  const cached = await getLatestMenuCache();
  if (!cached) return null;
  const ageMs = Date.now() - cached.syncedAt.getTime();
  const ttlMs = config.menu.cacheTtlHours * 60 * 60 * 1000;
  if (ageMs > ttlMs) return null;
  if (cached.menu.date && cached.menu.date !== todayInColombo()) return null;
  return cached.menu;
}
