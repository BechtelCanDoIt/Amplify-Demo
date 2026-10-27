// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import axios from "axios";
import { randomBytes } from "crypto";
import { config } from "../config";
import { UserToken } from "../types";
import { getToken, saveToken, deleteToken } from "../db/tokens";
import { getPool } from "../db/client";
import { backendErrorMessage, logBackendError } from "../utils/log";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export interface AuthContext {
  originalMessage?: string;
  spaceName?: string;
  threadName?: string;
  displayName?: string;
  userEmail?: string;
}

export async function generateAuthUrl(googleUserId: string, context?: AuthContext): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await getPool().execute(
    `INSERT INTO agent_oauth_states (state, google_user_id, expires_at, original_message, space_name, thread_name, display_name, user_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       expires_at       = VALUES(expires_at),
       original_message = VALUES(original_message),
       space_name       = VALUES(space_name),
       thread_name      = VALUES(thread_name),
       display_name     = VALUES(display_name),
       user_email       = VALUES(user_email)`,
    [state, googleUserId, expiresAt,
     context?.originalMessage ?? null,
     context?.spaceName ?? null,
     context?.threadName ?? null,
     context?.displayName ?? null,
     context?.userEmail ?? null]
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.asgardeo.clientId,
    redirect_uri: config.asgardeo.redirectUri,
    // openid → gives id_token with email + groups claims
    // email + groups → included as claims in the id_token
    scope: config.asgardeo.scopes.join(" "),
    state,
  });

  return `${config.asgardeo.authorizationEndpoint}?${params.toString()}`;
}

export async function handleCallback(
  code: string,
  state: string
): Promise<{ token: UserToken; googleUserId: string; context: AuthContext }> {
  const [rows] = await getPool().execute(
    `SELECT google_user_id, expires_at, original_message, space_name, thread_name, display_name, user_email
     FROM agent_oauth_states WHERE state = ?`,
    [state]
  );
  const row = (rows as any[])[0];
  await getPool().execute(`DELETE FROM agent_oauth_states WHERE state = ?`, [state]);
  if (!row || new Date(row.expires_at) < new Date()) {
    throw new Error("Invalid or expired OAuth state");
  }
  const pending = { googleUserId: row.google_user_id };
  const context: AuthContext = {
    originalMessage: row.original_message ?? undefined,
    spaceName: row.space_name ?? undefined,
    threadName: row.thread_name ?? undefined,
    displayName: row.display_name ?? undefined,
    userEmail: row.user_email ?? undefined,
  };

  let response;
  try {
    response = await axios.post(
      config.asgardeo.tokenEndpoint,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.asgardeo.redirectUri,
        client_id: config.asgardeo.clientId,
        client_secret: config.asgardeo.clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
  } catch (err: any) {
    logBackendError("[oauth]", "token exchange", err);
    throw new Error(`Token exchange failed: ${backendErrorMessage(err)}`);
  }

  const { access_token, id_token, refresh_token, expires_in } = response.data;
  console.log("[oauth] token exchange — access_token:", !!access_token, "| id_token:", !!id_token, "| refresh_token:", !!refresh_token, "| expires_in:", expires_in);

  if (!id_token) {
    throw new Error(
      "No id_token in OAuth response. Ensure 'openid', 'email', and 'groups' scopes are requested."
    );
  }

  const wso2Email = extractEmailFromJwt(id_token);
  if (!wso2Email) {
    throw new Error("Could not extract email from id_token. Ensure 'email' scope is granted.");
  }
  console.log("[oauth] wso2Email from id_token:", wso2Email);
  const token: UserToken = {
    googleUserId: pending.googleUserId,
    wso2Email,
    accessToken: access_token,
    idToken: id_token,
    refreshToken: refresh_token ?? null,
    expiresAt: new Date(Date.now() + expires_in * 1000),
  };

  await saveToken(token);
  return { token, googleUserId: pending.googleUserId, context };
}

export function extractEmailFromJwt(jwt: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    return payload.email ?? payload.username ?? payload.preferred_username ?? null;
  } catch {
    return null;
  }
}

// Refreshes both access_token and id_token using the refresh_token.
// Asgardeo returns a new id_token on refresh when 'openid' scope is present.
async function refreshTokens(token: UserToken): Promise<UserToken> {
  if (!token.refreshToken) throw new Error("No refresh token available");

  const response = await axios.post(
    config.asgardeo.tokenEndpoint,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      client_id: config.asgardeo.clientId,
      client_secret: config.asgardeo.clientSecret,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, id_token, refresh_token, expires_in } = response.data;
  const refreshed: UserToken = {
    ...token,
    accessToken: access_token,
    idToken: id_token ?? token.idToken,   // use new id_token if provided
    refreshToken: refresh_token ?? token.refreshToken,
    expiresAt: new Date(Date.now() + expires_in * 1000),
  };

  await saveToken(refreshed);
  return refreshed;
}

function isJwtExpiringSoon(jwt: string, bufferMs: number): boolean {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    if (!payload.exp) return false;
    return payload.exp * 1000 - Date.now() < bufferMs;
  } catch {
    return false;
  }
}

// Returns a valid id_token for the user, refreshing if needed.
// Checks both the stored expiresAt AND the id_token's own exp claim,
// since Asgardeo may not issue a new id_token on every refresh.
export async function getValidIdToken(googleUserId: string): Promise<string | null> {
  const token = await getToken(googleUserId);
  if (!token || !token.idToken) return null;

  const needsRefresh =
    token.expiresAt.getTime() - Date.now() < TOKEN_EXPIRY_BUFFER_MS ||
    isJwtExpiringSoon(token.idToken, TOKEN_EXPIRY_BUFFER_MS);

  if (needsRefresh) {
    try {
      const refreshed = await refreshTokens(token);
      if (!refreshed.idToken) {
        console.warn("[oauth] Refresh did not return a new id_token for", googleUserId);
        return null;
      }
      return refreshed.idToken;
    } catch (err: any) {
      logBackendError("[oauth]", `token refresh for ${googleUserId}`, err);
      if (err.response?.data?.error === "invalid_grant") {
        await deleteToken(googleUserId);
      }
      return null;
    }
  }

  return token.idToken;
}

// Removes OAuth state rows that were never completed (e.g. user abandoned the auth flow).
export async function deleteStaleOAuthStates(): Promise<void> {
  await getPool().execute(
    `DELETE FROM agent_oauth_states WHERE expires_at < NOW()`
  );
}

// Returns a valid access_token for the user, refreshing if needed.
// Used as Bearer when calling Choreo-managed APIs — Asgardeo is the key manager
// so the Choreo gateway validates it natively without token exchange.
export async function getValidAccessToken(googleUserId: string): Promise<string | null> {
  const token = await getToken(googleUserId);
  if (!token) return null;

  if (token.expiresAt.getTime() - Date.now() < TOKEN_EXPIRY_BUFFER_MS) {
    try {
      const refreshed = await refreshTokens(token);
      return refreshed.accessToken;
    } catch {
      return null;
    }
  }

  return token.accessToken;
}
