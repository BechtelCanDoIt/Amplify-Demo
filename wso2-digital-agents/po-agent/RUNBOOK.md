<!--
Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.

This software is the property of WSO2 LLC. and its suppliers, if any.
Dissemination of any information or reproduction of any material contained
herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
You may not alter or remove any copyright or other notice from copies of this content.
-->

# RUNBOOK — Novera

Operational procedures for the PO Agent. If you're on-call or just landed in the repo, start here when something's broken.

For context elsewhere:

- **Design / architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security log + defenses to preserve** → [SECURITY.md](./SECURITY.md)
- **Google Cloud / Workspace / Drive setup** → [docs/google-setup.md](./docs/google-setup.md)
- **Required env vars** → [.env.example](./.env.example)

---

## Incident response

### "App is not responding" appears in Chat

The most common cause is **Cloudflare WAF blocking inbound webhook traffic** from Google Chat (it gets flagged as bot traffic). A WAF bypass rule for the webhook host + path is required for each environment.

**Quick check:** Choreo logs for `[webhook]` lines around the time of the failed message.

- **No `[webhook]` entries → it's Cloudflare.** Add a bypass rule for the prod webhook host + `/webhook` path. See the `project_choreo_cloudflare_bot_bypass` note in the team's memory and [docs/google-setup.md](./docs/google-setup.md) → "Cloudflare bot-detection bypass for /webhook".
- **`[webhook]` entries exist but no reply** → look at app errors (e.g. backend timeout, LLM failure). Check `agent_llm_call_log` for the most recent rows by that user.

### A user reports two replies to one message

**Should no longer happen** since the async-reply refactor — the webhook ACKs in ~50 ms and Chat / Cloudflare / Choreo have nothing to retry. If you do see it post-refactor, something has regressed.

**Diagnostic (still useful for confirming):**
```sql
SELECT session_id, round, stop_reason, duration_ms, created_at
FROM agent_llm_call_log
WHERE google_user_id = '<users/...>' 
  AND created_at BETWEEN '<ts>' - INTERVAL 1 MINUTE
                     AND '<ts>' + INTERVAL 1 MINUTE
ORDER BY created_at;
```

Two distinct `session_id`s for the same user → two parallel agent runs were triggered.

**If it does happen after the async refactor:**
- Check that the `/webhook` handler actually returns `200 {}` early on slow paths (not `await asyncReply(...)`). A missing `setImmediate` or accidentally awaiting the async work would re-introduce the bug.
- Look for any code path that still calls `processMessage` synchronously from the webhook handler.
- A defense-in-depth dedup table (`agent_webhook_dedup` keyed on Chat `message.name`) was planned but unnecessary post-refactor; reconsider only if the issue recurs.

### A user reports the bot is stuck on "⏳ Working on it..." forever

The async-reply flow posted the placeholder but never got around to updating it. Possible causes:

1. **The agent process crashed** before reaching `updateMessage()`. Check Choreo logs for `[async-reply] Failed` lines. Anything thrown out of `processMessage` is logged and the placeholder is updated to a generic error message — but if the pod itself crashed mid-processing (OOM, unhandled rejection escaping the try/catch, etc.), the placeholder stays "Working on it...".
2. **The Chat API PATCH failed silently.** Check logs for `[proactive] updateMessage failed`. If the SA's access token expired and refresh failed, the update wouldn't go through. The agent did its work; only the final delivery to Chat is broken.

**Mitigation:** ask the user to send the message again. The Chat history retains the stuck placeholder but it's harmless (the model can still read it as past context).

**If frequent:** add a wall-clock timeout watcher inside `asyncReply` — if `processMessage` hasn't completed within e.g. 90 seconds, force-update the placeholder to "Sorry, this is taking longer than expected — please try again."

### Policy Q&A returns "policy lookup is not currently available"

The `agent_policy_corpus` row is missing or hasn't been populated yet.

```sql
SELECT id, doc_count, total_bytes, synced_at FROM agent_policy_corpus;
```

- **Zero rows** → sync hasn't completed since the last DB reset. Trigger a pod restart and watch Choreo logs for `[policy-sync] Sync complete — N doc(s)`.
- **Row exists but `doc_count = 0`** → sync ran but found no supported files in the folder. Check the folder contents (Google Docs / plain text / PDF / DOCX are supported; old `.doc`, Sheets, slides, and subfolders are skipped).
- **Row exists with stale `synced_at`** → the scheduled sync is not running. Check Choreo logs for `[policy-sync]` errors (often 401 / 403 — see below).

### Policy sync repeatedly logs 401 / `invalid_grant`

The HR-policy Google OAuth refresh token has been invalidated. Common causes: the authorising user changed their Google password, revoked the app at `myaccount.google.com`, the token went unused for 6+ months, or an admin revoked OAuth grants org-wide.

**Fix:** re-capture the refresh token (procedure below).

### Policy sync logs 403

The Drive folder isn't shared with the OAuth user, OR the Drive API isn't enabled in the Cloud project. See [docs/google-setup.md](./docs/google-setup.md) → "HR policy Drive ingestion".

### `report_issue` or `get_my_reported_issues` failing in chat

The issue tracker uses the **same OAuth refresh token** as the HR-policy sync, but needs the additional `spreadsheets` scope. Failures usually map to one of:

- **HTTP 403** — refresh token still only has `drive.readonly`, OR the sheet isn't shared with the OAuth user. Confirm both: try `report_issue` after [docs/google-setup.md](./docs/google-setup.md) → "Upgrade scope on the existing token", and verify sheet sharing.
- **HTTP 404** — `ISSUES_SHEET_ID` is wrong or the sheet was trashed. Check Choreo env vars + Drive's "Trash".
- **HTTP 400 invalid_grant** — refresh token revoked. Re-run the OAuth Playground capture (both scopes ticked) and update `HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN`. Note: this will also break HR policy sync until updated.
- **No error but user sees "I couldn't record that"** — check `agent_audit_log` for `action = 'report_issue'`, `response_status = 'FAILED'`, and read the `response_message` (≤500 chars of the sanitized backend error).

If the sheet is reachable but reads are slow, the open-issues corpus block silently falls back to empty (the agent fails-open on `listOpenIssues` so the rest of the chat stays available) — duplicate-detection effectiveness drops until the API recovers.

### Duplicate issue rows in the sheet

The agent assigns `issue_id` as `max(existing) + 1` without locking, so two near-simultaneous reports can land with the same ID. Low volume makes this rare. To clean up:

1. Identify the duplicates by `description` similarity and `reported_at` proximity (typically within ~1s of each other).
2. Keep the lower `issue_id` row as canonical.
3. Set the duplicate row's `status` to `Fixed` and `dev_comment` to `"Duplicate of #<canonical_id>"`.
4. No agent restart needed; the next chat turn picks up the change.

### User reports the bot replied "You've reached your daily token quota"

That user has spent more than `USER_TOKEN_QUOTA_PER_DAY` (default 50 000) LLM tokens — input + output, summed across all agentic rounds — in the last rolling 24 hours. Sustained by the per-user token quota gate in `processMessage`.

**Confirm it's quota and not a bug.** Search Choreo logs for `[quota] user <email>` lines around the time of the complaint, and check the audit log:

```sql
SELECT created_at, response_message
FROM agent_audit_log
WHERE wso2_email = '<user@wso2.com>'
  AND action = 'llm_quota'
ORDER BY created_at DESC
LIMIT 10;
```

`response_message` carries the used vs. limit numbers — e.g. *"Exceeded 50000 token quota in last 24h (used: 52317)"*.

**Then pick one of:**

- **Wait it out.** Window is a rolling 24h — usage from > 24h ago drops off automatically. Best default for one-off abuse or genuinely heavy use that should self-correct.
- **Reset for that specific user** (e.g. you've confirmed it's a power tester, not abuse). Delete the user's recent llm_call_log rows so the SUM resets:
  ```sql
  DELETE FROM agent_llm_call_log
  WHERE google_user_id = 'users/...' AND created_at > NOW() - INTERVAL 24 HOUR;
  ```
  Next chat turn unblocks them. The audit-log `BLOCKED` rows stay (history).
- **Raise the global cap** if you're seeing legitimate users hit it routinely. Bump `USER_TOKEN_QUOTA_PER_DAY` on Choreo env vars and restart the pod. Consider keeping the new value documented in the env var notes too.
- **Tighten further** if you're seeing abuse you want to discourage faster. Lower `USER_TOKEN_QUOTA_PER_DAY` — but be mindful: at 10 K/day even moderate use will hit it.

There is no per-user override config (yet). If a specific user genuinely needs a permanently higher cap, the simplest patch is to add a small "trusted users" allowlist in `src/agent/claude.ts` that skips the quota check; flag the gap if this becomes a regular request.

### Webhook returns 401 with "Invalid token caller"

The `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL` env var on Choreo doesn't match the actual signer of the inbound JWT. Common in fresh environments — each Workspace Add-on registration uses a different Google-managed service account.

**Fix:** re-capture per [docs/google-setup.md](./docs/google-setup.md) → "Capturing the inbound webhook caller email" and update the env var on Choreo.

### Webhook 401 with "Invalid token issuer"

The inbound JWT's `iss` claim is not `https://accounts.google.com`. Either someone is spoofing requests or Google changed something. Investigate before relaxing the check.

---

## Maintenance procedures

### Recover from a bad policy corpus sync

The corpus is a regenerable cache (Drive is the source of truth). If the latest sync produced garbage or a partially-populated corpus:

```sql
DELETE FROM agent_policy_corpus WHERE id = 1;
```

Then restart the pod — the boot-time sync rebuilds the row within ~60 seconds. Briefly, policy questions will get the "not currently available" response.

### Re-capture the HR-policy + issues OAuth refresh token

The same refresh token is used by both the HR-policy sync (`drive.readonly`) and the issues tracker (`spreadsheets`). When it's invalidated, both features stop together.

1. Identify the user account whose token will hold access — either the original authoriser, or pick a dedicated robot mailbox if one exists.
2. Confirm the Drive folder is shared with that user, AND the issues sheet is shared with that user.
3. Re-run [docs/google-setup.md](./docs/google-setup.md) → "Upgrade scope on the existing token" (OAuth Playground with **both** scopes ticked → authorize as the user → exchange code → copy refresh token). Capturing with only `drive.readonly` will silently break the issues feature.
4. Update `HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN` on Choreo (staging + prod separately).
5. Restart the pod; watch `[policy-sync]` logs AND exercise `report_issue` in chat to confirm both paths recovered.

### Re-capture the inbound webhook caller email (after promoting to a new env)

The signer is per-Workspace-Add-on-registration. Each new environment captures a different value.

See [docs/google-setup.md](./docs/google-setup.md) → "Capturing the inbound webhook caller email" — the procedure adds a one-line debug log, deploys, sends a `/help`, reads the value from Choreo logs, and removes the debug log.

### Promote the agent to a new environment (staging / region)

High-level checklist — full details in [docs/google-setup.md](./docs/google-setup.md):

- [ ] New Google Cloud Project with Chat API + Workspace Marketplace SDK + Drive API enabled
- [ ] OAuth Consent Screen User Type = Internal
- [ ] Workspace Marketplace listing published as Private (My Domain Only)
- [ ] Chat App registered (manifest, slash commands, endpoint URL)
- [ ] Asgardeo OAuth client + redirect URI for the new env
- [ ] Choreo component with subscriptions to Leave, Menu, and People backends
- [ ] MySQL schema applied (`src/db/schema.sql` for a fresh DB)
- [ ] `agent_dm_spaces` filled for any existing installs (see [Backfill DM spaces](#backfill-dm-spaces))
- [ ] **Cloudflare WAF bypass rule** for the new webhook host + path (otherwise Chat traffic is blocked at the edge)
- [ ] All required env vars set on Choreo — see [.env.example](./.env.example) for the full list. The app fails-fast at startup on any missing.
- [ ] Webhook caller email captured for the new env (see above)
- [ ] HR-policy Drive folder shared with the OAuth user; refresh token captured **with both `drive.readonly` and `spreadsheets` scopes** (see above)
- [ ] Issues sheet created (or staging's reused); shared with the OAuth user + dev team; `ISSUES_SHEET_ID` set on Choreo

### Recover from a lost or rotated `TOKEN_ENCRYPTION_KEY`

`TOKEN_ENCRYPTION_KEY` is the AES-256-GCM key used to encrypt:

- All OAuth tokens in `agent_user_tokens` (`access_token`, `id_token`, `refresh_token`)
- All conversation history in `agent_conversations` (`messages` column)

If the key is lost (or replaced with a new value), existing ciphertext becomes unreadable. **The system handles this gracefully** — `decrypt()` returns `null` on any failure (wrong format, wrong key, corruption), the calling code treats that as stale/legacy data and deletes the row, and the affected user goes through `/connect` again on their next message. **No manual data cleanup is required.**

**Steps to recover:**

1. Generate a new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set it as `TOKEN_ENCRYPTION_KEY` on Choreo (staging + prod separately) — and locally for dev.
3. Restart the pod(s).
4. (Optional) Pre-emptively clear the affected tables to avoid the lazy-cleanup-on-read churn:
   ```sql
   TRUNCATE TABLE agent_user_tokens;
   TRUNCATE TABLE agent_conversations;
   ```

**User-visible impact:**

- Active users see *"Your WSO2 session has expired. Please reconnect your account to continue: <auth URL>"* on their next message.
- They click `/connect`, authorize via Asgardeo, and they're back. Typical OAuth flow.
- New conversations start fresh (no chat history rolled forward).

**What is NOT affected** (these tables don't use the key):

- `agent_audit_log` — action + status + short message only, no payloads
- `agent_llm_call_log` — metadata only (session, tokens, durations)
- `agent_policy_corpus` — public policy content, not encrypted
- `agent_oauth_states` — short-lived (10 min TTL), no sensitive data

#### Rotating the key WITHOUT losing data

The above procedure intentionally discards encrypted data — that's the "lost key" path. If you instead want to **rotate** the key while preserving tokens and conversations (e.g. periodic key rotation for compliance), the system doesn't have a built-in migration. You'd need a one-shot script that:

1. Reads each `agent_user_tokens` / `agent_conversations` row with the OLD key (via `src/db/crypto.ts`'s `decrypt`).
2. Re-encrypts the decrypted plaintext with the NEW key.
3. Updates the row.
4. Repeats for the other table.

Run it with the pod stopped to avoid concurrent reads/writes against half-migrated rows. Then set the new key and restart.

Not currently scripted — if/when this becomes a routine, add the migration as a one-off in `scripts/` and document the invocation here.

### Backfill DM spaces

Notifications (`POST /internal/notifications`) go to every row in `agent_dm_spaces`. Novera keeps that table current from webhook events, but DMs that existed before it did must be backfilled once per environment. [`scripts/backfill-dm-spaces.mjs`](./scripts/backfill-dm-spaces.mjs) is standalone: it needs only Node.js 18+ and that environment's service-account key (the JSON in `GOOGLE_SERVICE_ACCOUNT_KEY`), so it can be handed to whoever holds the key. It lists Novera's DMs from the Chat API, looks up the person in each, and writes two files without touching Google or the database.

1. Run it:
   ```bash
   node backfill-dm-spaces.mjs --key novera-sa.json --env staging
   ```
   It prints `N DMs: M in the SQL, S skipped` and writes `dm-spaces-staging.sql` and `dm-spaces-staging.csv` (the migration report). Only DMs whose person could be looked up go into the SQL; the CSV lists every DM with `imported` and the reason for any skip. A `403 … administrator restricts this Chat app` usually means that person is no longer allowed to use this environment's Novera (e.g. removed from the Chat app's Visibility list). Run it from outside the repo, and keep the key there too.
2. Run `dm-spaces-staging.sql` against the environment's MySQL. It creates `agent_dm_spaces` if needed and is safe to run more than once: existing rows only gain values they're missing.
3. Deploy, then repeat steps 1–2 to catch anyone who added Novera in between.
4. Export the [current user report](#everyone-novera-can-notify) as CSV.

Both files, and the report, hold employees' names and Chat ids: they're git-ignored, so keep them out of the repo and share them only with whoever needs them.

### Roll back / disable a specific tool

To remove a tool without redeploying the rest:

1. Remove the case from the `executeTool` switch in `src/agent/claude.ts`.
2. Remove the tool's schema from the `TOOLS` array.
3. Remove the tool name from `LEAVE_ONLY_TOOL_NAMES` if it was there.
4. Remove the capability mention from both system-prompt variants' "Available actions".
5. Remove user-facing references in `src/index.ts` (helpText examples + post-OAuth welcome).

Past `tool_use` blocks in stored conversations are harmless — the model can read them as context but can't re-invoke a tool that's not in the active array.

### Restart pods

Standard Choreo restart from the Console (Deploy view → Restart). No data loss — all state is in MySQL.

---

## Useful diagnostic queries

### Recent tool calls by a specific user

```sql
SELECT created_at, action, response_status, response_message
FROM agent_audit_log
WHERE google_user_id = '<users/...>'
ORDER BY created_at DESC
LIMIT 50;
```

### Duplicate-reply check (two LLM sessions for one user within 60 seconds)

```sql
SELECT session_id, round, stop_reason, tools_called, duration_ms, created_at
FROM agent_llm_call_log
WHERE google_user_id = '<users/...>'
  AND created_at BETWEEN '<ts>' - INTERVAL 1 MINUTE
                     AND '<ts>' + INTERVAL 1 MINUTE
ORDER BY created_at;
```

Two distinct `session_id`s = retry-induced double-processing.

### Policy corpus state

```sql
SELECT id, doc_count, total_bytes, synced_at FROM agent_policy_corpus;
```

If `total_bytes` is 0, a sync ran but the folder was empty / all-unsupported. If `synced_at` is older than the configured `HR_POLICY_SYNC_INTERVAL_HOURS`, the scheduled sync has stopped (check logs).

### LLM cost / latency trend (last 30 days)

```sql
SELECT DATE(created_at) AS day,
       COUNT(*)         AS calls,
       AVG(duration_ms) AS avg_ms,
       MAX(duration_ms) AS max_ms,
       SUM(input_tokens)  AS in_tokens,
       SUM(output_tokens) AS out_tokens
FROM agent_llm_call_log
GROUP BY day
ORDER BY day DESC
LIMIT 30;
```

`max_ms` jumps over 5000 ms are the kind of slow rounds that provoke webhook retries.

### Tool-call frequency (last 30 days)

```sql
SELECT action,
       COUNT(*) AS calls,
       SUM(CASE WHEN response_status = 'SUCCESS' THEN 1 ELSE 0 END) AS ok,
       SUM(CASE WHEN response_status = 'FAILED'  THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN response_status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked
FROM agent_audit_log
WHERE created_at > NOW() - INTERVAL 30 DAY
GROUP BY action
ORDER BY calls DESC;
```

Useful for tracking adoption (e.g. how often `get_letter_request_form` is being called).

### Users with stale auth (most likely to need a /connect refresh)

```sql
SELECT google_user_id, wso2_email, expires_at
FROM agent_user_tokens
WHERE expires_at < NOW()
ORDER BY expires_at DESC
LIMIT 50;
```

Refresh failures will surface as `[oauth] Token refresh failed` in Choreo logs.

### Users currently over the token quota

```sql
SELECT google_user_id, wso2_email,
       SUM(input_tokens + output_tokens) AS used_24h
FROM agent_llm_call_log
WHERE created_at > NOW() - INTERVAL 24 HOUR
GROUP BY google_user_id, wso2_email
HAVING used_24h > 50000   -- match USER_TOKEN_QUOTA_PER_DAY
ORDER BY used_24h DESC;
```

### Quota-block history (who got blocked and when)

```sql
SELECT created_at, wso2_email, response_message
FROM agent_audit_log
WHERE action = 'llm_quota' AND response_status = 'BLOCKED'
ORDER BY created_at DESC
LIMIT 50;
```

### Top token consumers in the last 30 days

```sql
SELECT wso2_email,
       COUNT(*) AS llm_calls,
       SUM(input_tokens)  AS in_tokens,
       SUM(output_tokens) AS out_tokens,
       SUM(input_tokens + output_tokens) AS total_tokens
FROM agent_llm_call_log
WHERE created_at > NOW() - INTERVAL 30 DAY
GROUP BY wso2_email
ORDER BY total_tokens DESC
LIMIT 20;
```

Useful for tuning `USER_TOKEN_QUOTA_PER_DAY` — if the highest legitimate user is well under the cap, you can tighten safely; if 5+ users are near it, consider raising it.

---

### Everyone Novera can notify

One row per DM in `agent_dm_spaces`. `email` is empty for someone who has never connected and hasn't messaged Novera since the backfill; every row should be a `@wso2.com` address once it's known.

```sql
SELECT d.display_name,
       COALESCE(d.email, t.wso2_email)  AS email,
       (t.google_user_id IS NOT NULL)   AS connected,
       d.google_user_id,
       d.space_name,
       d.created_at                     AS added_at
FROM agent_dm_spaces d
LEFT JOIN agent_user_tokens t ON t.google_user_id = d.google_user_id
ORDER BY d.display_name;
```

## When in doubt

- For a question the runbook doesn't cover, **check the team's auto-memory** (often holds non-obvious historical context — Cloudflare bypass, security-review status, env-specific gotchas).
- For a question about the *design* (rather than ops), → [ARCHITECTURE.md](./ARCHITECTURE.md).
- For anything genuinely new (a failure mode you've never seen), **document it here** under the appropriate section before the next on-call cycle.
