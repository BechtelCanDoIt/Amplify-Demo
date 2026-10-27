// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import { getPool } from "./client";
import { encrypt, decrypt } from "./crypto";
import { UserToken } from "../types";

export async function getToken(googleUserId: string): Promise<UserToken | null> {
  const [rows] = await getPool().execute(
    `SELECT google_user_id, wso2_email, access_token, id_token, refresh_token, expires_at
     FROM agent_user_tokens WHERE google_user_id = ?`,
    [googleUserId]
  );
  const row = (rows as any[])[0];
  if (!row) return null;

  const accessToken = decrypt(row.access_token);
  const idToken = row.id_token ? decrypt(row.id_token) : null;
  const refreshToken = row.refresh_token ? decrypt(row.refresh_token) : null;

  // Decryption returning null means the stored value is legacy plaintext or corrupted.
  // Delete the record so the user is prompted to re-authenticate cleanly.
  if (accessToken === null) {
    console.warn("[tokens] Decryption failed for user", googleUserId, "— deleting stale token");
    await deleteToken(googleUserId);
    return null;
  }

  return {
    googleUserId: row.google_user_id,
    wso2Email: row.wso2_email,
    accessToken,
    idToken: idToken ?? undefined,
    refreshToken: refreshToken ?? undefined,
    expiresAt: new Date(row.expires_at),
  };
}

export async function saveToken(token: UserToken): Promise<void> {
  await getPool().execute(
    `INSERT INTO agent_user_tokens
       (google_user_id, wso2_email, access_token, id_token, refresh_token, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       wso2_email    = VALUES(wso2_email),
       access_token  = VALUES(access_token),
       id_token      = VALUES(id_token),
       refresh_token = VALUES(refresh_token),
       expires_at    = VALUES(expires_at),
       updated_at    = CURRENT_TIMESTAMP`,
    [
      token.googleUserId,
      token.wso2Email,
      encrypt(token.accessToken),
      token.idToken ? encrypt(token.idToken) : null,
      token.refreshToken ? encrypt(token.refreshToken) : null,
      token.expiresAt,
    ]
  );
}

export async function deleteToken(googleUserId: string): Promise<void> {
  await getPool().execute(
    `DELETE FROM agent_user_tokens WHERE google_user_id = ?`,
    [googleUserId]
  );
}
