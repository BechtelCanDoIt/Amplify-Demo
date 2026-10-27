<!--
Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.

This software is the property of WSO2 LLC. and its suppliers, if any.
Dissemination of any information or reproduction of any material contained
herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
You may not alter or remove any copyright or other notice from copies of this content.
-->

# Google Cloud setup — PO Agent

Why the PO Agent requires a Google Cloud Project and a service account, what each is responsible for, how to provision the outbound service account JSON key (`GOOGLE_SERVICE_ACCOUNT_KEY`), and how to capture the inbound webhook caller email used to pin JWT verification (`GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL`).

## Why we need a Google Cloud Project

The agent is a Google Chat Workspace Add-on, which is a Cloud-Project-scoped resource. The project owns four things we directly depend on:

1. **Google Chat API enablement** — without it, our `spaces.messages.create` calls (proactive replies) are rejected at the API layer.
2. **Workspace Add-on / Chat App registration** — the deployed manifest, the slash commands (`/leave`, `/status`, `/connect`, `/help`), and the webhook URL all live here.
3. **JWT audience binding** — Google signs every webhook call to `/webhook` and pins the JWT's `aud` claim to the project's configured webhook URL (`GOOGLE_CHAT_WEBHOOK_AUDIENCE`). Verification only passes against that one project.
4. **Service-account home** — service accounts are project-scoped resources. The one we use must belong to the same Cloud project as the add-on; one from a different project cannot post into spaces the add-on is installed in.

The Cloud project is, in effect, the single tenant boundary for everything Google-side: bot identity, API permissions, signing keys, and trust chain.

## Why we need a service account

The agent has three communication paths with users:

| Direction | Channel | Authenticated by |
|---|---|---|
| User → bot | Google Chat webhook → `/webhook` | Google-signed JWT (verified per request) |
| Bot → user (sync reply) | Return value of the webhook handler | Implicit, same turn |
| Bot → user (out of band) | Chat REST API `spaces.messages.create` | **Service account** |

The third row is the reason we need a service account. After `/connect`, the user opens the Asgardeo authorization URL in a browser, authenticates, and lands at `/auth/callback`. By that point the original Chat webhook turn — the one that issued the auth link — returned long ago. There is no active webhook to reply through, but we still need to deliver the answer (the result of the user's original question, e.g. *"apply casual leave for tomorrow"*) back into the Chat space.

The only way to push a message into a space without an inbound webhook is to call the Chat REST API directly, and that API requires an authenticated principal. A **service account** is the standard choice because it is:

- a **stable, headless identity** that can be authorized once and reused indefinitely,
- **decoupled from any one user's session** — unlike using a user's `id_token`, it doesn't require anyone to be currently authenticated,
- **scoped to the same Cloud project** as the add-on, so it can post into any space the bot is added to without per-space provisioning.

That is why `GOOGLE_SERVICE_ACCOUNT_KEY` is described in `.env.example` as "for sending proactive messages after OAuth completion" — proactive messaging is its only consumer in the code path.

## Provisioning steps

How to obtain the service account JSON key that populates `GOOGLE_SERVICE_ACCOUNT_KEY`. Run through this once per environment (dev / staging / prod) — a separate key per project is the norm.

### 1. Open the right Cloud Project

Go to <https://console.cloud.google.com> and select the project the Google Workspace Add-on is deployed under. The service account must live in the same project as the Add-on registration — see [Why we need a Google Cloud Project](#why-we-need-a-google-cloud-project) above for why.

### 2. Find or create the service account

- Left menu → **IAM & Admin → Service Accounts**.
- If the Workspace Add-on is already deployed, the service account exists. Its email follows the pattern `<bot-name>@<project-id>.iam.gserviceaccount.com` (e.g. `xx-agent@my-project.iam.gserviceaccount.com`).
- If none exists, click **Create Service Account**, give it a descriptive name, and click **Done**. No specific project IAM roles are required — authorization to post into a Chat space comes from the space itself, not from project IAM.

### 3. Enable the Google Chat API

- Left menu → **APIs & Services → Enabled APIs & services**.
- Search for **Google Chat API**. If it appears, this step is done.
- If not, click **+ Enable APIs and Services**, find Google Chat API in the library, and enable it.

Without this, `spaces.messages.create` calls fail with `PERMISSION_DENIED` even with a valid key.

### 4. Generate the JSON key

- Click the service account row to open it.
- Open the **Keys** tab.
- **Add Key → Create new key → JSON → Create**.
- A `.json` file downloads automatically. Treat it like a credential — anyone holding it can post into every Chat space the bot is a member of.

The file shape:

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "<bot-name>@<project-id>.iam.gserviceaccount.com",
  ...
}
```

### 5. Set `GOOGLE_SERVICE_ACCOUNT_KEY`

Paste the **entire JSON contents** of the downloaded file as the env-var value:

- **Choreo:** paste the raw JSON into the env-var field. Choreo accepts multi-line values.
- **Local dev (`.env`):** paste the JSON as the value of `GOOGLE_SERVICE_ACCOUNT_KEY=`. Most dotenv parsers handle multi-line quoted values; if yours doesn't, wrap the value in double quotes.

The app loads this once at startup and uses it for every proactive post via `src/chat/proactive.ts`.

### 6. Confirm the service account matches the Add-on's bot identity

For proactive messages to land in a user's DM space, the `client_email` in the key file **must** be the same identity as the Workspace Add-on's bot. DM spaces can't be joined manually — Google Chat grants bot access automatically when the user installs or opens the Add-on, but only to the bot's own service account.

If `spaces.messages.create` returns `403`, the identities don't match. Check **Google Workspace Admin Console → Apps → Google Workspace Marketplace apps → your Add-on** to see which service account the Add-on is registered under, and either:

- update the Add-on to use the service account you generated the key for, or
- generate a new key for the existing Add-on service account instead.

## Capturing the inbound webhook caller email

The service account you provisioned in steps 1–6 above is the **outbound** identity — it signs the bot's calls *out* to the Chat REST API. The **inbound** signer is a separate identity: when Google Chat POSTs to `/webhook`, it signs the JWT in `Authorization: Bearer` using a different service account that Google manages on the Add-on's behalf. Pinning verification to that exact email (rather than accepting any SA in the same Google-managed domain) is what `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL` is for.

### Why it's a different identity

| | Outbound (`GOOGLE_SERVICE_ACCOUNT_KEY`) | Inbound signer (webhook JWT) |
|---|---|---|
| Provisioned by | You | Google (auto, when the Add-on is deployed) |
| Lives in | Your Cloud project | Google's `gcp-sa-gsuiteaddons` system project |
| Used for | Calling `spaces.messages.create` (proactive replies) | Signing the JWT on incoming `/webhook` calls |
| Email shape | `<bot-name>@<your-project-id>.iam.gserviceaccount.com` | `service-<your-project-number>@gcp-sa-gsuiteaddons.iam.gserviceaccount.com` |

The inbound signer does **not** appear in your project's IAM list — `gcp-sa-gsuiteaddons` is Google-managed and lives outside your project. The `client_email` from the JSON key file therefore cannot be reused as `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL`; they are two distinct service accounts.

### How to capture the exact value

The email is deterministic per project, but the cleanest way to obtain it is to log one real webhook:

1. **Add a one-line debug log** in `verifyChatRequest` (`src/index.ts`), immediately after `ticket.getPayload()`:
   ```js
   console.log("[auth-debug] iss:", payload?.iss, "| email:", payload?.email, "| aud:", payload?.aud);
   ```
2. **Deploy** to a reachable environment (staging, or production if no staging).
3. **Send any message** to the bot — `/help` is enough; the webhook fires before the bot processes the command.
4. **Tail Choreo logs** for the `[auth-debug]` line. Expected shape:
   ```
   [auth-debug] iss: https://accounts.google.com | email: service-XXXXXXXXXXXX@gcp-sa-gsuiteaddons.iam.gserviceaccount.com | aud: <your-webhook-url>
   ```
5. **Record three values:**
   - `iss` — should be `https://accounts.google.com`. If different, the issuer-pinning check in `verifyChatRequest` needs to use the value you observed.
   - `email` — this is the value for `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL`. Set it in `.env` and on Choreo to the exact string.
   - `aud` — should equal `GOOGLE_CHAT_WEBHOOK_AUDIENCE`. Already enforced by Google's library; this is a sanity check.
6. **Remove the debug log** before committing the strict-signer code change. The log line is marked with a `TODO(MEDIUM-3)` comment.

### Why empirically rather than constructing the email

The pattern `service-<project-number>@gcp-sa-gsuiteaddons.iam.gserviceaccount.com` is the standard form for Google-managed Workspace Add-on signers, and the project number is available via:

```bash
gcloud projects describe <your-project-id> --format="value(projectNumber)"
```

So you can construct the expected email without a deploy. We recommend empirical capture anyway — one debug round confirms the exact string Google uses for this specific Add-on registration, eliminating risk of a mismatch against a guessed prefix or a format Google changes.

## New-environment / prod deployment checklist

When promoting the PO Agent to a new Choreo environment (new prod region, fresh component, migration), several things need to be set up beyond deploying the image:

- [ ] **New Google Cloud Project + service account + JSON key** per [Provisioning steps](#provisioning-steps). Set `GOOGLE_SERVICE_ACCOUNT_KEY` in Choreo env.
- [ ] **Webhook caller email captured for this project** — the value is per-project (`service-<project-number>@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`); staging's value will NOT work elsewhere. Capture per [Capturing the inbound webhook caller email](#capturing-the-inbound-webhook-caller-email) and set `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL`.
- [ ] **Backend subscriptions** — in the Choreo Developer Portal, subscribe the new component to the Leave and Menu backends; copy the gateway URLs into `LEAVE_BACKEND_URL` and `MENU_BACKEND_URL`.
- [ ] **HR-policy + issues OAuth** — re-run [HR policy Drive ingestion](#hr-policy-drive-ingestion) for the new env (a new refresh token per env is the norm), and ensure the captured token carries **both** `drive.readonly` and `spreadsheets` scopes per [Upgrade scope on the existing token](#upgrade-scope-on-the-existing-token).
- [ ] **Issues sheet** — either create a fresh sheet for this env or reuse staging's; share with the new env's OAuth user + dev team; set `ISSUES_SHEET_ID`.
- [ ] **All other required env vars set** per `.env.example` (the app fails fast at startup if any `required()` var is missing).
- [ ] **Cloudflare bot-detection bypass for `/webhook`** — see below.
- [ ] **Smoke test:** `curl <prod-host>/health` returns `{"status":"ok"}` with 200; send `/help` in Chat and confirm reply; exercise `/connect` and one leave operation end-to-end.

### Cloudflare bot-detection bypass for `/webhook`

Choreo prod sits behind Cloudflare. Cloudflare's default bot-detection treats **Google Chat's outbound webhook traffic** as bot traffic (the requests originate from Google service-account identities) and **drops them at the edge, before Choreo**.

**Symptom:** Chat shows "App is not responding"; Choreo logs show the app running cleanly on port 3000 but **no inbound `/webhook` request lines** for the failed message. The request never reaches the app.

**Fix:** add a Cloudflare WAF / bot-management rule to **bypass bot detection for the prod webhook host + path** (e.g. `<prod-host>/webhook`). Apply the equivalent rule for every new environment.

**Diagnostic shortcut:** "App is not responding" in Chat + zero `/webhook` log entries in Choreo for the failed message → suspect Cloudflare before chasing app-side / probe / env-var issues.

## HR policy Drive ingestion

The agent answers HR-policy questions by reading the full policy corpus from a Google Drive folder. The folder is synced periodically (every `HR_POLICY_SYNC_INTERVAL_HOURS`, default 24h) and concatenated into MySQL. At chat time, the corpus is prepended to the system prompt as a cacheable block.

### Why not the existing service account

WSO2's Workspace **Domain Restricted Sharing (DRS)** policy blocks sharing Drive items with non-wso2.com identities — and service-account addresses live in `*.iam.gserviceaccount.com`, which is outside the allowlist. So the bot authenticates as a **real wso2.com user** via OAuth 2.0 instead. A designated user authorizes the bot once; the resulting refresh token is stored in env and used indefinitely.

This is the same pattern other internal Digital apps use for Drive access.

### One-time ops setup

1. **Enable the Google Drive API** in the same Cloud project as the Add-on (Cloud Console → APIs & Services → Library → "Google Drive API" → Enable).
2. **Add the `drive.readonly` scope** to the OAuth consent screen (Cloud Console → APIs & Services → Google Auth Platform → Data Access → Add or remove scopes → `https://www.googleapis.com/auth/drive.readonly` → Update). Since the consent screen is "Internal", no Google verification is needed.
3. **Create an OAuth 2.0 Client ID** for the policy sync (Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID).
   - Application type: **Web application**. (Older versions of this guide said Desktop app — that worked under Google's pre-2022 out-of-band flow but no longer works reliably with OAuth Playground; Google deprecated OOB. Use Web application.)
   - Under **Authorized redirect URIs**, add `https://developers.google.com/oauthplayground` — this is required for the token capture in step 6. You can keep it permanently (it's not a security risk on its own — Playground itself can't authenticate as your client without your secret) or remove it after capture and re-add when you next rotate the token; either is fine.
   - Note the **Client ID** and **Client Secret** that get generated.
4. **Pick the user whose identity will be used.** Two options:
   - **A. A team member's account** — quick to set up; bot stops syncing if that person leaves WSO2 or revokes access. OK for staging / pilot.
   - **B. A dedicated robot mailbox** (e.g. `novera-svc@wso2.com`) — survives team changes; requires IT to provision. Recommended for prod.
5. **Share the policy folder with that user.** Open the Drive folder → **Share** → add the user's wso2.com email → **Viewer** → Share. Normal wso2.com Drive sharing — no admin involvement.
6. **Capture a refresh token via OAuth Playground** (5-minute one-off):
   - Open <https://developers.google.com/oauthplayground/>
   - Top-right gear icon → **Use your own OAuth credentials** → paste the Client ID + Secret from step 3 → Close.
   - Left panel → scroll to **Drive API v3** → tick `https://www.googleapis.com/auth/drive.readonly`. If this client will also serve the issues sheet (it should, going forward — see [Issues sheet](#issues-sheet)), also tick **Google Sheets API v4** → `https://www.googleapis.com/auth/spreadsheets` in the same authorize step. Capturing both scopes together avoids needing a second round trip later.
   - Click **Authorize APIs**.
   - Sign in as the designated user from step 4. Grant consent.
   - On the next step, click **Exchange authorization code for tokens**.
   - Copy the **Refresh token** that appears in the response panel.

   **If you see "Error 400: redirect_uri_mismatch"**, the most likely cause is that the OAuth client created in step 3 was Desktop type (no redirect URI field) or doesn't list `https://developers.google.com/oauthplayground` under Authorized redirect URIs. Either fix that on the existing Web client, or create a fresh Web client per step 3 specifically for this capture. Note that **refresh tokens are tied to the OAuth client that issued them** — if you create a new client for the capture, its Client ID + Secret are what must end up in `HR_POLICY_GOOGLE_OAUTH_CLIENT_ID` / `..._CLIENT_SECRET` alongside the captured refresh token. They're a set.
7. **Set env vars** on Choreo (and `.env` locally):
   - `HR_POLICY_DRIVE_FOLDER_ID` — the segment after `/folders/` in the Drive URL.
   - `HR_POLICY_GOOGLE_OAUTH_CLIENT_ID` — from step 3.
   - `HR_POLICY_GOOGLE_OAUTH_CLIENT_SECRET` — from step 3.
   - `HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN` — from step 6.
   - (Optional) `HR_POLICY_SYNC_INTERVAL_HOURS` if 24 hours is too infrequent.

The refresh token is a **secret** — treat it with the same care as the SA JSON key. Use Choreo's secret config, not plain env, for prod.

After the next pod restart, the agent runs an immediate sync at startup and logs to Choreo:

```
[policy-sync] Starting Drive sync for folder <id>
[policy-sync] Skipped 1 unsupported file(s): Comp Table.xlsx (application/vnd.google-apps.spreadsheet)
[policy-sync] Sync complete — 14 doc(s), 87234 bytes, 1842 ms
```

### Supported formats

- **Google Docs** — exported as plain text via `files.export?mimeType=text/plain`.
- **Plain text** files — fetched directly.
- **PDF** — text extracted via `pdf-parse`. Works for selectable-text PDFs (most modern policy docs exported from Word / Google Docs). Scanned / image-only PDFs return little-to-no text — when extraction yields under 50 chars, a warning is logged identifying the suspect file so it can be re-exported or converted. OCR is not in scope.
- **Word `.docx`** — text extracted via `mammoth`. Tables and styles are flattened to plain text.

Still skipped (logged as unsupported):

- Old Word `.doc` files (binary format) — convert to `.docx` or Google Doc.
- Google Sheets, slides, drawings, forms.
- Subfolders (MVP doesn't recurse — flatten the structure or ask for a follow-up).

### What the agent does with the corpus

- The corpus is included in the agent's system prompt under a `## HR Policy Documents` section.
- Guidelines 17 (SL) / 14 (non-SL) instruct the model to **cite the source document title** in every policy answer and to refuse to answer (rather than guess) if the question isn't covered.
- The corpus block uses Anthropic prompt caching (`cache_control: ephemeral`), so the token cost is paid only on cache miss (~5 min TTL or whenever the corpus is re-synced).
- The corpus is shown to **all employees regardless of location** — there's no separate non-SL gate, since HR policies tend to apply globally (or have location-specific sections within them). If WSO2 ever needs region-specific policy folders, this can be parameterized.

### Diagnostic tips

- **"Policy lookup is not currently available"** in chat replies → the corpus is empty in MySQL. Either the sync hasn't run yet (wait ~30s after pod start), or the sync failed silently. Check Choreo logs for `[policy-sync]` lines.
- **Sync logs show 401 (invalid_grant or token revoked)** → the refresh token has been invalidated. Common causes: the authorising user changed their password, revoked the app at <https://myaccount.google.com/permissions>, the token hasn't been used for 6+ months, or an admin revoked OAuth grants. Re-run step 6 of the setup to capture a new refresh token.
- **Sync logs show 403** → the folder isn't shared with the OAuth user, or the Drive API isn't enabled.
- **Sync logs show 400 (invalid_client)** → `HR_POLICY_GOOGLE_OAUTH_CLIENT_ID` or `_CLIENT_SECRET` is wrong, or the credentials are from a different Cloud project than the refresh token.
- **Sync logs show "No supported policy docs found"** → folder is empty or contains only PDFs/Word/Sheets (which are currently skipped — see Supported formats).
- **All policy answers are stale** → corpus hasn't re-synced. Check `synced_at` in `agent_policy_corpus` (latest row).

### When to refresh the refresh token

The refresh token is long-lived but not eternal. Plan a re-auth (re-run step 6) when:

- The authorising user leaves WSO2.
- The user changes their Google password (invalidates all refresh tokens).
- 6 months pass with the bot not running (rare but possible during long pauses).
- An admin tightens OAuth grants org-wide.

If you went with a dedicated robot mailbox (step 4 option B), most of these never happen and the token effectively lasts forever.

## Issues sheet

The agent records user-reported bugs in a Google Sheet and lets users check the status of issues they filed. Same OAuth user as the HR-policy sync — the refresh token just needs to carry an additional scope.

### Sheet schema

The sheet has a single tab named `Sheet1`. The agent auto-creates the header row on first write; it is idempotent (re-running against an already-populated sheet does nothing). Columns:

| Column | Header | Owner | Notes |
|---|---|---|---|
| A | `issue_id` | agent | Monotonic from `1`; computed as `max(existing) + 1` at append time |
| B | `reporter_email` | agent | The authenticated WSO2 email of the reporter |
| C | `reported_at` | agent | ISO-8601 UTC timestamp at append time |
| D | `description` | agent | 1–3 sentences; model is instructed to strip sensitive data |
| E | `status` | dev team | `Initial` (default on append) → `In-Progress` → `Fixed` |
| F | `dev_comment` | dev team | Free-text note for the user — surfaced via `get_my_reported_issues` |
| G | `updated_at` | dev team | Bookkeeping; not enforced by the agent |

The model checks `listOpenIssues()` (all rows where status ≠ `Fixed`) **before** appending, to avoid duplicate filings.

### One-time setup

1. **Enable the Google Sheets API** in the same Cloud project as the Add-on (Cloud Console → APIs & Services → Library → "Google Sheets API" → Enable).
2. **Upgrade the OAuth scope** on the existing HR-policy OAuth client to add `spreadsheets`. See [Upgrade scope on the existing token](#upgrade-scope-on-the-existing-token) below — this is the most common case if HR policy is already running.
3. **Create the Google Sheet.** Use the same Google account whose OAuth refresh token is in `HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN` (the sheet must be readable + writable by the bot's OAuth identity). Note the sheet ID — the segment between `/d/` and `/edit` in the URL.
4. **Share with the dev team** (Editor permissions) so they can triage: set `status` and add `dev_comment`.
5. **Set `ISSUES_SHEET_ID`** on Choreo (and `.env` locally) to the sheet ID from step 3. The app fails fast at startup if unset.

The agent writes the header row on first append, so a blank sheet is fine to start with.

### Upgrade scope on the existing token

The HR-policy sync's refresh token only has `drive.readonly`. The issues feature needs `spreadsheets` too. Add the second scope by re-capturing:

1. **Confirm the OAuth client created in step 3 of HR-policy setup is Web application type and has `https://developers.google.com/oauthplayground` under Authorized redirect URIs.** If it was created as Desktop app (the now-deprecated pre-2022 path the old docs suggested), Playground won't work against it — create a *new* Web application OAuth client for the capture and use *that* client's ID/Secret in step 4 below. Refresh tokens are tied to the issuing client, so if you switch clients here you must also update `HR_POLICY_GOOGLE_OAUTH_CLIENT_ID` / `..._CLIENT_SECRET` on Choreo to match.
2. **Add the scope to the OAuth consent screen** (Cloud Console → APIs & Services → Google Auth Platform → Data Access → Add or remove scopes → tick `https://www.googleapis.com/auth/spreadsheets` → Update). The screen is "Internal" so no Google verification is required.
3. **Enable the Google Sheets API** in the Cloud project if not already (Cloud Console → APIs & Services → Library → "Google Sheets API" → Enable). Without this, Playground will accept the scope tick but Sheets calls at runtime return `accessNotConfigured`.
4. **Re-authorize via OAuth Playground** — same flow as step 6 of HR-policy setup, but this time tick **both** scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
   Sign in as the same wso2.com user that the existing refresh token belongs to (otherwise the policy sync's Drive folder share won't apply). Click **Exchange authorization code for tokens** and copy the new refresh token.
5. **Replace `HR_POLICY_GOOGLE_OAUTH_REFRESH_TOKEN`** with the new value on Choreo (and locally). After the next pod restart, both the HR-policy sync and the issues feature work off the same token.

The old refresh token does not have to be explicitly revoked — Google rotates it the moment the new one is issued via Playground.

### Diagnostic tips

- **`get_my_reported_issues` returns no issues even though the user filed one** → the sheet's `reporter_email` column doesn't match the authenticated user. The agent normalises via case-insensitive compare, but a typo in the sheet (or a manual row entered without the column header) defeats it. Inspect the row directly.
- **`report_issue` fails with 403** → either the sheet isn't shared with the OAuth user, OR the refresh token still only has `drive.readonly`. Verify the scope upgrade landed (re-running OAuth Playground with both scopes is the cleanest check).
- **`report_issue` fails with 404** → `ISSUES_SHEET_ID` is wrong or the sheet was deleted/trashed.
- **`report_issue` returns 400 (invalid_grant)** → refresh token revoked. Re-run the OAuth Playground capture per [Upgrade scope on the existing token](#upgrade-scope-on-the-existing-token).
- **Duplicate issue rows** → two reports landed within the same race window (low volume, accepted MVP risk). De-dup manually: keep the older `issue_id`, set the newer row's `status` to `Fixed`, and add a `dev_comment` pointing to the canonical issue.

### When NOT to use the issues sheet

This is a lightweight feedback channel for the agent itself — bot misbehaviour, wrong replies, broken tool calls. It is **not** a replacement for the formal Linear / GitHub trackers the dev team uses for the underlying backends (leave-app, menu-app, people-app). For backend-issue reports, the dev team triages the sheet entry and forwards to the appropriate tracker manually.

## Related documents

- [ARCHITECTURE.md](../ARCHITECTURE.md) — full system architecture, including the auth model and the `/auth/callback` → proactive-reply flow
- [CLAUDE.md](../CLAUDE.md) — repo conventions and intentional gaps
- [.env.example](../.env.example) — `GOOGLE_CHAT_WEBHOOK_AUDIENCE`, `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `HR_POLICY_GOOGLE_OAUTH_*`, and `ISSUES_SHEET_ID` env vars referenced above
