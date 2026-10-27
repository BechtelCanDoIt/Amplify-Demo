// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Every 1:1 DM between Novera and one person: where notifications go.
// Record and remove swallow errors, like db/threads.ts: a DB blip must never
// break the chat path.

import { getPool } from "./client";

export interface DmUser {
  googleUserId?: string;
  displayName?: string;
  email?: string;
}

// A value that's missing here never erases one already stored.
export async function recordDmSpace(spaceName: string, user: DmUser = {}): Promise<void> {
  try {
    await getPool().execute(
      `INSERT INTO agent_dm_spaces (space_name, google_user_id, display_name, email)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         google_user_id = COALESCE(VALUES(google_user_id), google_user_id),
         display_name   = COALESCE(VALUES(display_name), display_name),
         email          = COALESCE(VALUES(email), email)`,
      [spaceName, user.googleUserId || null, user.displayName || null, user.email || null],
    );
  } catch (err) {
    console.error("[dm-spaces] recordDmSpace failed:", err);
  }
}

export async function removeDmSpace(spaceName: string): Promise<void> {
  try {
    await getPool().execute("DELETE FROM agent_dm_spaces WHERE space_name = ?", [spaceName]);
  } catch (err) {
    console.error("[dm-spaces] removeDmSpace failed:", err);
  }
}

export interface DmSpace {
  spaceName: string;
  googleUserId: string | null;
}

export async function listDmSpaces(): Promise<DmSpace[]> {
  const [rows] = await getPool().execute("SELECT space_name, google_user_id FROM agent_dm_spaces");
  return (rows as { space_name: string; google_user_id: string | null }[]).map((row) => ({
    spaceName: row.space_name,
    googleUserId: row.google_user_id,
  }));
}
