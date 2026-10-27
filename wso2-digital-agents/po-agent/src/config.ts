// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

// Optional URL-valued var. Unset -> undefined (caller falls back to its own default).
// Set but unparseable -> throw at startup rather than at the first outbound call.
function optionalUrl(key: string): string | undefined {
  const value = process.env[key];
  if (!value) return undefined;
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid URL in environment variable ${key}: ${value}`);
  }
  return value;
}

export const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com";

export const config = {
  port: parseInt(process.env.PORT || "3000"),

  // Trust the first reverse proxy's X-Forwarded-For header. Must be true when deployed
  // behind a trusted proxy (Choreo ingress, nginx, ALB) and false for direct-exposure
  // deployments — otherwise attackers can spoof X-Forwarded-For to defeat IP-based
  // rate limiting and pollute IP-keyed logs.
  trustProxy: process.env.TRUST_PROXY === "true",

  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    // Optional override of the Anthropic API endpoint (proxy, gateway, mock server).
    // Left unset, the SDK applies its own default (DEFAULT_ANTHROPIC_BASE_URL above).
    // The API key travels to whatever host is set here — keep it https outside localhost.
    baseUrl: optionalUrl("ANTHROPIC_BASE_URL"),
  },

  // Maximum LLM tokens (input + output, summed across all rounds) any single
  // user is allowed to spend in a rolling 24-hour window. When exceeded, the
  // bot rejects further chat turns with a polite "try again later" message,
  // logs `[quota] ...` to stdout, and writes a BLOCKED row to agent_audit_log
  // with action='llm_quota'. Default 50_000 ≈ ~$0.50/user/day at Sonnet 4.6
  // pricing if no prompt-cache hits — covers normal usage; abusive or runaway
  // loops are stopped before they accumulate real spend.
  userTokenQuotaPerDay: parseInt(process.env.USER_TOKEN_QUOTA_PER_DAY || "50000", 10),

  // How long the async-reply loop waits before posting the "⏳ Working on
  // it..." placeholder. Fast turns that finish under this threshold skip the
  // placeholder entirely (one Chat API call instead of two); slower turns
  // still get the placeholder + in-place update flow.
  // Tune lower if users notice a long silent gap before any feedback;
  // tune higher to suppress the placeholder for more turns.
  placeholderDelayMs: parseInt(process.env.PLACEHOLDER_DELAY_MS || "3000", 10),

  asgardeo: {
    clientId: required("ASGARDEO_CLIENT_ID"),
    clientSecret: required("ASGARDEO_CLIENT_SECRET"),
    authorizationEndpoint: required("ASGARDEO_AUTH_ENDPOINT"),
    tokenEndpoint: required("ASGARDEO_TOKEN_ENDPOINT"),
    redirectUri: required("ASGARDEO_REDIRECT_URI"),
    // Must match existing experience APIs — groups are required for role-based
    // checks in experience APIs (e.g. leave backend role validation)
    scopes: ["openid", "email", "groups", "offline_access"],
  },

  // 64-char hex string (32 bytes) used to AES-256-GCM encrypt tokens at rest.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),

  // URL of the Google Form the PO Team uses to receive letter requests
  // (employment confirmation, visa letter, salary letters, passport renewal, etc.).
  // Differs between staging and prod — set the appropriate value per environment.
  letterRequestFormUrl: required("LETTER_REQUEST_FORM_URL"),

  mysql: {
    host: required("DB_HOST"),
    port: parseInt(process.env.DB_PORT || "3306"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: process.env.DB_NAME || "po_agent",
    // Set DB_SSL=true in production when the MySQL host is remote
    ssl: process.env.DB_SSL === "true",
  },

  services: {
    leaveBackendUrl: required("LEAVE_BACKEND_URL"),
    menuBackendUrl: required("MENU_BACKEND_URL"),
    peopleBackendUrl: required("PEOPLE_BACKEND_URL"),
    // gh-project-board-stats service — provides the WSO2 engineering
    // project board release schedule (this-week / next-week iterations).
    // Choreo API Gateway URL from the Developer Portal. The service holds
    // its own GitHub credentials; Novera authenticates to the service via
    // the standard Choreo token exchange (x-jwt-assertion at gateway).
    releasesBackendUrl: required("RELEASES_BACKEND_URL"),
    // subscription-app backend — lunch (meal) and commute (PickMe) subscribe/
    // unsubscribe/status tools.
    subscriptionBackendUrl: required("SUBSCRIPTION_BACKEND_URL"),
  },

  choreo: {
    tokenEndpoint: required("CHOREO_TOKEN_ENDPOINT"),
    clientId: required("CHOREO_CLIENT_ID"),
    clientSecret: required("CHOREO_CLIENT_SECRET"),
  },

  googleChat: {
    // Full webhook URL — used to verify JWT audience in incoming webhook requests
    // e.g. https://your-proxy-url/webhook
    webhookAudience: required("GOOGLE_CHAT_WEBHOOK_AUDIENCE"),
    // Exact service-account email pinned for webhook JWT verification (see docs/google-setup.md to capture).
    webhookCallerEmail: required("GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL"),
    // Google service account credentials JSON (stringified) — used for proactive Chat API messages
    // and for PO-policy Google Drive ingestion (drive.readonly scope).
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  },

  policy: {
    // Master switch for the PO-policy Drive sync. When false, startPolicySync()
    // is a no-op — the corpus never refreshes. The agent still runs (PO policy
    // Q&A just falls through to its "policy not currently available" path),
    // and all other features (leave, menu, vehicles, issues) are unaffected.
    // Useful for local dev, debugging, or environments where the policy Drive
    // folder hasn't been set up yet. Default ON in prod-like deployments.
    syncEnabled: (process.env.HR_POLICY_SYNC_ENABLED ?? "true").toLowerCase() === "true",
    // Google Drive folder ID containing PO policy docs (Google Docs / plain text).
    // Share the folder with the user whose OAuth refresh token is configured below
    // (normal wso2.com Drive sharing — see docs/google-setup.md).
    driveFolderId: required("HR_POLICY_DRIVE_FOLDER_ID"),
    // How often to re-sync the Drive folder. Default 24h matches the expected cadence
    // of PO policy updates; lower if you publish more often.
    syncIntervalHours: parseInt(process.env.HR_POLICY_SYNC_INTERVAL_HOURS || "24", 10),
    // OAuth 2.0 credentials used to read the PO policy folder AND the issues sheet
    // (single refresh token, both `drive.readonly` and `spreadsheets` scopes).
    // Service accounts don't work for this — WSO2 Workspace policy blocks Drive
    // sharing with `*.iam.gserviceaccount.com` addresses. See docs/google-setup.md
    // for the one-time OAuth Playground setup that produces the refresh token,
    // and "Upgrade scope" if you're adding sheets to an existing drive-only token.
    oauthClientId: required("HR_POLICY_GOOGLE_OAUTH_CLIENT_ID"),
    oauthClientSecret: required("HR_POLICY_GOOGLE_OAUTH_CLIENT_SECRET"),
    oauthRefreshToken: required("HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN"),
  },

  issues: {
    // Google Sheet ID for the user-reported issue tracker. Share the sheet with
    // the user whose OAuth refresh token is configured above (same user as the
    // PO policy folder) and with the Digital team (read+write).
    // See docs/google-setup.md → "Issues sheet".
    sheetId: required("ISSUES_SHEET_ID"),
  },

  training: {
    // Master switch for the WSO2 Training & Certification corpus sync. When
    // false, startTrainingSync() is a no-op — the corpus never refreshes, and
    // the trainingBlock injected into the system prompt falls back to a
    // "training playbook not currently available" message directing users to
    // the escalation contacts below. Same pattern as HR_POLICY_SYNC_ENABLED.
    syncEnabled: (process.env.TRAINING_SYNC_ENABLED ?? "true").toLowerCase() === "true",
    // Google Drive folder ID for the training/certification playbook (owned
    // by the Training & Certification team; they edit the doc in place, we
    // sync it on the configured cadence). Share the folder with the same
    // wso2.com user whose OAuth refresh token drives PO-policy sync — one
    // OAuth identity, two Drive folders. Only required when sync is enabled.
    driveFolderId: process.env.TRAINING_DRIVE_FOLDER_ID ?? "",
    // Sync cadence — default 24h. The playbook changes slowly (mostly link
    // updates, occasional new certification pages), so 24h is comfortable.
    syncIntervalHours: parseInt(process.env.TRAINING_SYNC_INTERVAL_HOURS || "24", 10),
    // Escalation contacts — required env vars, no fallbacks. Ops rotates the
    // owners here without waiting for the training team to edit the Drive doc,
    // and keeps personal email addresses out of source control. Injected into
    // the system prompt as an "Escalation Contacts (current)" block — the
    // model prefers these over any older addresses in the playbook body.
    contacts: {
      trainingTeam: required("TRAINING_TEAM_EMAIL"),
      certificationTeam: required("CERTIFICATION_TEAM_EMAIL"),
      teamLeads: required("TRAINING_TEAM_LEADS"),
    },
  },

  menu: {
    // Cafeteria menu cache TTL. The get_menu tool call runs on-demand for the
    // first Sri Lanka user asking within a fresh window; the result is UPSERTed
    // into agent_menu_cache and injected into the system prompt for subsequent
    // turns so the model can answer menu Qs without a tool round-trip. Default
    // 1h — menu changes at most daily, so an hour is short enough that stale
    // updates surface quickly. Cache also invalidates automatically when the
    // stored date != today (Colombo TZ), so day-boundary correctness is
    // preserved regardless of TTL.
    cacheTtlHours: parseInt(process.env.MENU_CACHE_TTL_HOURS || "1", 10),
  },

};
