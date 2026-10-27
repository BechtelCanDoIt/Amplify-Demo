<!--
Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.

This software is the property of WSO2 LLC. and its suppliers, if any.
Dissemination of any information or reproduction of any material contained
herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
You may not alter or remove any copyright or other notice from copies of this content.
-->

# Security Review Log — PO Agent

A running ledger of security findings for Novera (internal codename: PO Agent, previously known as the WSO2 Digital Assistant). Each finding is tracked with a severity, status, and closing reference. New reviews append findings; closed findings stay in the file with their resolution so the history is auditable.

> **Note on filename.** `SECURITY.md` is conventionally GitHub's vulnerability-reporting policy file. Since this repo is private and internal, we use it instead as the internal findings log. If the repo ever goes public, split this file: public vuln-reporting policy stays at `SECURITY.md`, findings move to `docs/security-findings.md` (or similar).

## Severity criteria

| Severity | Definition | Target SLA |
|---|---|---|
| **HIGH** | Exploitable now by an external party, or an internal authenticated user can escalate beyond their authority. Affects confidentiality, integrity, or availability significantly. | Fix in next patch |
| **MEDIUM** | Exploitable under specific conditions, or a meaningful defense-in-depth gap (would matter if another control failed). | Fix within the quarter |
| **LOW** | Hardening or cleanup. No immediate exploit path, or very high attacker effort. Worth fixing alongside other work. | When convenient |

## Review history

| Date | Reviewer | Scope | Findings (H/M/L) | Notes |
|---|---|---|---|---|
| 2026-05-27 | Claude (Opus 4.7) | Full po-agent code | 2 / 4 / 2 | Triggered by suspicion that removing the global rate limit re-introduced a DoS path. Confirmed. |

---

## Open findings

_None — all findings from the 2026-05-27 review are now closed. This section will fill on the next review._

---

## Closed findings

### HIGH-1 — Rate limiter precedes JWT verification on `/webhook`

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `8e4e8b2`)
- **Location**: `src/index.ts:89`

```js
app.post("/webhook", webhookUserRateLimit, verifyChatRequest, ...);
```

**Description**. The per-user rate limiter runs before the Google JWT verification middleware. It keys on `req.body.chat.user.name`, which is attacker-controlled in unauthenticated requests. Each unique value gets its own 60/min bucket, so an attacker varying that field across requests bypasses the per-user limit entirely.

**Impact**.
- Unauthenticated request rate is effectively uncapped (the commented-out global limit at `index.ts:29–35` was the only safety net).
- `express-rate-limit`'s default `MemoryStore` accumulates one entry per unique key per 60-second window — memory pressure under sustained attack.
- Every rejected request still pays the cost of `express.json()` parsing (50 KB cap) plus JWT signature verification (Google JWKs are cached, but verification CPU is non-zero).

**Fix applied**. Middleware order on `/webhook` was swapped so `verifyChatRequest` runs before `webhookUserRateLimit`, and the global `1000/min` limiter was re-enabled ahead of body parsing. The bounded-store option was deferred — global + per-authenticated-user is sufficient cover for now.

---

### HIGH-2 — `/auth/callback` has no rate limit

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `8e4e8b2`)
- **Location**: `src/index.ts:153`

**Description**. The OAuth callback endpoint has no rate limiting. Each call triggers a MySQL `SELECT` + `DELETE` on `agent_oauth_states` and (on a state hit) a POST to Asgardeo's token endpoint.

**Impact**. An attacker can flood the endpoint to:
- Consume Asgardeo token-exchange API quota and spend.
- Generate DB load on `agent_oauth_states`.
- Pollute logs.

State validation will reject the request, but the DB roundtrip happens first.

**Fix applied**. Added `authCallbackRateLimit` (30/min/IP, keyed on `req.ip`) and mounted it on `/auth/callback` ahead of the handler.

---

### MEDIUM-1 — `trust proxy = 1` allows IP spoofing if deployed without a reverse proxy

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `e74b1a1`)
- **Location**: `src/index.ts:23`

**Description**. `app.set("trust proxy", 1)` is hard-coded. Correct on Choreo (there is a proxy). If anyone ever runs the agent directly (dev, debug, alternate host), an attacker can spoof `X-Forwarded-For` to defeat IP-based rate limiting and pollute IP-keyed logs.

**Fix applied**. Added `config.trustProxy` (reads `TRUST_PROXY` env var via `=== "true"`, defaults to `false`) and changed the call to `app.set("trust proxy", config.trustProxy ? 1 : false)`. `.env.example` documents the var: set `true` on Choreo and behind other trusted reverse proxies, `false` (or omit) for direct-exposure deployments.

---

### LOW-2 — `app.set("trust proxy", 1)` magic number

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `e74b1a1`)
- **Location**: `src/index.ts:23`

**Description**. Subsumed by MEDIUM-1's fix (env var). Splitting into its own LOW because the hard-coded `1` is also a readability issue independent of the spoofing risk — a named constant or comment explaining the Choreo-specific reason would help.

**Fix applied**. Closed alongside MEDIUM-1 in commit `e74b1a1`. The `1` is still literal at the call site (`config.trustProxy ? 1 : false`), but it is now wrapped in an explanatory comment at the call site and a fuller comment on the `config.trustProxy` field describing when it applies — a reader landing on the `1` has the context one click away.

---

### MEDIUM-4 — `express.json()` is applied globally

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `af671a1`)
- **Location**: `src/index.ts:37`

**Description**. JSON parsing runs for every route, including `/health` and `/auth/callback` (which has no JSON body). Minor DoS amplification.

**Fix applied**. Removed the global `app.use(express.json({ limit: "50kb" }))` and mounted the parser inline on `/webhook`, between `verifyChatRequest` and `webhookUserRateLimit`. Unauthenticated requests are rejected by the JWT check before paying any body-parse cost; `/health` and `/auth/callback` skip the parser entirely. The 50 KB cap is preserved.

**Follow-up hardening (2026-06-19)**. The body-size limit on `/webhook` was further tightened from `50kb` to `4kb`. Rationale at the time: a typical Workspace Add-on event envelope was estimated at ~700–1000 bytes; Google Chat caps user message text at 4000 chars; 4 KB was thought to give ~3 KB of headroom for text after envelope, well above any real prompt, and to shrink the DoS surface by an order of magnitude. Image / file uploads — previously accepted (and silently dropped by the LLM) — are now rejected synchronously at the top of the webhook handler via a route-scoped 4-arg error handler, since the bot has no attachment-handling tools.

**Correction / re-tuning (2026-07-01)**. The 4 KB cap turned out to be too tight in practice: real Workspace Add-on payloads (with `commonEventObject`, repeated `chat.user` / `sender` blocks, full `space` metadata, and — in some Marketplace SDK configurations — an embedded OAuth token) run 2–5 KB even for trivial commands like `/help`. Multiple real users hit false-positive 413s, including on the shortest possible input (`/connect` at 8 characters). The cap was raised to **16 KB** — still ~3× tighter than the historical 50 KB (so the DoS-surface hardening intent is preserved), but comfortably above any legitimate Google Chat payload including OAuth-token-carrying and group-space cases. The `webhookErrorHandler` was also updated to log the offending `content-length` on rejection, so any future tightening/loosening decision has real data behind it rather than an estimate.

**Follow-up hardening — per-user LLM token quota (2026-06-19)**. Added a per-user token quota gate in `processMessage` (`src/agent/claude.ts`) closing a related cost-DoS gap: the existing 60/min/user webhook rate limit caps *request rate* but not *spend*, so a sustained attacker (or runaway agent loop) could rack up Anthropic charges within the rate envelope. The new gate sums `input_tokens + output_tokens` from `agent_llm_call_log` for the requesting `google_user_id` over a rolling 24h window; if the total is at or above `USER_TOKEN_QUOTA_PER_DAY` (default 50_000 ≈ ~$0.50/user/day at Sonnet 4.6 pricing), the bot rejects the chat turn with a polite "try again in a few hours" message, emits `[quota] user <email> exceeded …` to stdout, and writes a `BLOCKED` row to `agent_audit_log` with `action='llm_quota'`. The check is once per chat turn, after auth verification, before any Anthropic call — so blocked turns cost only the SUM query, not a model call. New composite index `idx_user_created_at (google_user_id, created_at)` on `agent_llm_call_log` keeps the SUM cheap as the table grows. Per-user override allowlist is not built in; RUNBOOK has the manual reset / raise procedure.

---

### MEDIUM-3 — Webhook JWT issuer check is by email-suffix only

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `70ae204`)
- **Location**: `src/index.ts:74`

```js
if (!payload?.email?.endsWith("@gcp-sa-gsuiteaddons.iam.gserviceaccount.com")) { ... }
```

**Description**. The `audience` check (which pins the JWT to the webhook URL) is the primary defense and is correct. The issuer check, however, matches any service account in the domain — not specifically Google Chat's Workspace Add-on SA. If Google ever issues tokens from another SA in that domain to this audience, they'd be accepted.

**Fix applied**. Replaced the suffix match with two strict checks in `verifyChatRequest`: (1) `payload.iss === "https://accounts.google.com"` and (2) `payload.email === config.googleChat.webhookCallerEmail`. The exact caller SA email is now sourced from a new required env var `GOOGLE_CHAT_WEBHOOK_CALLER_EMAIL`, captured per `docs/google-setup.md` ("Capturing the inbound webhook caller email"). App fails fast at startup if the var is missing. A commented-out debug log was left in place for future webhook-auth troubleshooting.

---

### MEDIUM-2 — Backend error responses are logged verbatim

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `d2079b0`)
- **Location**: `src/tools/leave.ts:39`, similar patterns in `src/tools/menu.ts`, `src/auth/oauth.ts:90`

```js
const detail = err.response?.data ? JSON.stringify(err.response.data) : ...;
console.error("[leave] submitLeave failed — status:", err.response?.status, "| detail:", detail);
```

**Description**. If a backend (Leave, Menu, Asgardeo) returns 4xx/5xx with a body containing internal details (stack traces, SQL fragments, employee records), the entire body lands in stdout logs. Choreo log access then becomes a sensitivity boundary you may not be modeling.

**Fix applied**. Introduced `src/utils/log.ts` with two helpers — `backendErrorMessage(err)` (extracts a clean string from `data.message` / `error_description` / `error` / `err.message`, no raw-body fallback) and `logBackendError(prefix, action, err)` (structured `console.error` with status + sanitized message; emits the raw body only when `LOG_LEVEL=debug`). Updated five catch blocks across `tools/leave.ts` (submitLeave, cancelLeave), `tools/menu.ts` (getMenu), and `auth/oauth.ts` (token exchange, token refresh). `.env.example` documents `LOG_LEVEL=info` as the production default. As a side benefit, user-facing replies no longer leak raw error bodies when a backend omits a `.message` field.

---

### LOW-1 — Verbose token-exchange error logging

- **First reported**: 2026-05-27
- **Status**: Fixed (commit `d2079b0`)
- **Location**: `src/auth/oauth.ts:90`

**Description**. The success path logs only `!!access_token` / `!!id_token` (boolean presence — good). The catch path falls back to `JSON.stringify(err.response.data)` if no structured error fields are present, which could include sensitive Asgardeo response payloads.

**Fix applied**. Closed alongside MEDIUM-2 in commit `d2079b0`. The Asgardeo token-exchange catch (`auth/oauth.ts`) now uses `logBackendError(...)` + `backendErrorMessage(...)` from `src/utils/log.ts` — the catch no longer JSON-stringifies the raw response body into either the log or the thrown `Error.message`.

---

## Defenses that look right — do NOT remove without analysis

These are deliberate, working defenses. Future reviews should not flag them as missing, and code changes should not strip them under the heading of "simplification":

- **AES-256-GCM encryption at rest** for tokens (`db/tokens.ts` + `db/crypto.ts`) and conversation history (`db/conversations.ts`).
- **Per-tool-call identity guard** in `executeTool` (`agent/claude.ts`): re-extracts `email` from the id_token and compares to stored `wso2_email`.
- **Destructive-action ownership re-verification** (`cancel_leave`, `delete_vehicle`): the target ID must be in the user's own list (fetched fresh, scoped to `wso2Email` via `getPendingLeaves` / `getVehicles`) before the DELETE is issued. Mismatch is audit-logged as `BLOCKED` and refused.
- **OAuth state generation**: 32 random bytes, base64url-encoded, persisted with 10-minute expiry, deleted on use, swept hourly.
- **HTML escaping** of `wso2Email` in the OAuth callback success page (`src/index.ts`).
- **SQL parameterization**: every `getPool().execute(...)` call uses placeholders, never string concatenation.
- **`encodeURIComponent` on user-email URL segments**: every path that interpolates `wso2Email` (e.g. `/employees/{email}/vehicles`) is escaped. Defends against path injection if an unexpected character ever appears in the email.
- **`MAX_TOOL_ROUNDS = 10`** cap on the agentic loop (`agent/claude.ts`).
- **Audit log payload-stripping**: `agent_audit_log` stores only `action`, `response_status`, and a 500-char `response_message`. No tool inputs/outputs. Same for `agent_llm_call_log` — metadata only.
- **`UPLOADED_CONTENT` filter + resourceName regex** in attachment handling (legacy, removed with OPD but worth remembering if file uploads return).
- **`helmet()` for security headers** + body-size limit on `express.json()`.

---

## How to add a new review

1. Append a row to the **Review history** table with date, reviewer, scope, and finding counts.
2. For each new finding, create a section under **Open findings** using the next ID for that severity (HIGH-3, MEDIUM-5, LOW-3, …). Don't reuse IDs even after a finding closes.
3. Use the template below.
4. When a finding is fixed, move its full section to **Closed findings**, update status, and link the closing commit.

### Finding template

```markdown
### SEVERITY-N — One-line title

- **First reported**: YYYY-MM-DD
- **Status**: Open | Fixed (commit `hash`) | Won't fix (rationale) | Accepted risk (owner, expiry)
- **Location**: `path/to/file.ts:line` (multiple OK)

**Description**. What the issue is, in plain language. Include the bad pattern as a code block when helpful.

**Impact**. What an attacker (or accidental misuse) achieves. Be specific — "could allow X" beats "is insecure".

**Fix**. The concrete change to make. If there are multiple acceptable fixes, list them; if one is preferred, say which and why.
```

## Related documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — design reference (C4 diagrams, auth model, data model)
- [CLAUDE.md](./CLAUDE.md) — repo conventions, intentional-gap notes, things-not-to-do for AI sessions
