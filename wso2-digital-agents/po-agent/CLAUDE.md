<!--
Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.

This software is the property of WSO2 LLC. and its suppliers, if any.
Dissemination of any information or reproduction of any material contained
herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
You may not alter or remove any copyright or other notice from copies of this content.
-->

# Working in this repo

This file is auto-loaded by Claude Code when it runs in this directory. It captures the conventions and gotchas that aren't obvious from source. For the design itself, read [ARCHITECTURE.md](./ARCHITECTURE.md) — it has the C4 Context, Container, and Component diagrams plus the auth, data, and tooling reference.

## What this is

**Novera** (internal codename: PO Agent) — a Google Chat AI agent that handles leave management, food menu lookup, and vehicle registration for WSO2 employees. Phase 1 scope only. The product was previously called "WSO2 Digital Assistant"; renamed to Novera in 2026-06 per a leadership decision. Stale references to the old name may still appear in commit history, the threat-model docx files, and security-review documents.

The authoritative source lives here, in `wso2-digital-agents/po-agent/`. An older copy used to live at `digiops-infra/apps/digiops-agent/` — it was deleted on 2026-05-25. If you see references to that path elsewhere, treat them as stale.

## Quick start

```bash
npm install

# Bootstrap the database (one-time)
mysql -h <host> -u <user> -p < src/db/schema.sql

# Generate the token encryption key (one-time, paste into .env)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy and fill the environment file
cp .env.example .env

# Dev (ts-node, no build)
npm run dev

# Build + start (production)
npm run build && npm start
```

`.env.example` is the authoritative list of required env vars. The app fails fast on startup if any required var is missing.

## Repo layout

- `src/` — all TypeScript source, one subdirectory per L3 component (see ARCHITECTURE.md L3)
- `src/db/schema.sql` — MySQL schema; run once before first start
- `scripts/` — standalone one-off scripts (plain Node.js, no dependencies). They import nothing from `src/` and aren't built or deployed
- `.choreo/component.yaml`, `.choreo/openapi.yaml` — Choreo deployment manifest
- `Dockerfile` — multi-stage; production stage runs as non-root user `10014` (Choreo policy)
- `.env.example` — authoritative env-var list

## Coding conventions

- **Copyright header** on every `.ts` file (WSO2 LLC., current year). Don't omit on new files.
- **No JSDoc, no multi-paragraph comments.** Short inline `//` only when the *why* is non-obvious.
- **Tool result shape** is `{ success: boolean; message: string; data?: object }`. New backend tools should keep this contract so the Agent Loop can dispatch them uniformly.
- **Log prefixes**: `console.log/error("[module] ...")` — e.g. `[oauth]`, `[leave]`, `[security]`. Used grep-side to filter by area.
- **Tests**: none currently. Don't fabricate a test command; flag the gap if asked.

## Things NOT to do

- **Don't add OPD code back.** Removed in commit `454c86b` after the scope narrowed. If OPD returns, treat it as a new feature, not a resurrection of the old code (which leaked across `tools/`, `chat/attachments.ts`, and `types.ts`).
- **Don't store request/response payloads in `agent_audit_log`.** The columns were removed in commit `564c353` for privacy. Only `response_status` + a 500-char `response_message` are kept. The same applies to `agent_llm_call_log` — metadata only, never prompts or responses.
- **Don't use `access_token` as Bearer to the Leave or Menu backends.** Use `id_token` — backends need the JWT claims (`email`, `groups`). `access_token` is opaque.
- **Don't remove the per-tool-call identity guard** in `executeTool` (`jwt.email === wso2_email`). It is the only defence against mid-session token swap.
- **Don't skip `sanitizeMessages`** on conversation load/save. The Anthropic API rejects conversations that begin with an orphaned `tool_result` block; sanitization is what prevents that.
- **Don't expand the `CHOREO_TOKEN_ENDPOINT/CLIENT_ID/CLIENT_SECRET` env vars.** They are vestigial from a removed RFC 8693 token-exchange path; better to delete them than to give them new meaning.
- **Don't introduce cross-user actions.** Every tool only ever operates on the authenticated user's own records. Guideline 1 in the system prompt rejects mentions of other users' emails; the identity guards enforce it at the code layer.

## Deployment

Choreo picks up changes pushed to `main` via `.choreo/component.yaml`. The OpenAPI declares `/webhook`, `/auth/callback`, and `/health` all with `security: []` — gateway auth is intentionally off; verification happens in-app (Google JWT for the webhook, OAuth state for the callback). `/internal/notifications` is the exception: it keeps the gateway's subscription auth, which is its only protection.

## Known intentional gaps

These are known and not bugs — don't "helpfully" fix them without context:

- **Dead config**: `CHOREO_TOKEN_ENDPOINT/CLIENT_ID/CLIENT_SECRET` are `required()` in `config.ts` but never used.
- **Dead function**: `getValidAccessToken` in `src/auth/oauth.ts` is defined but never called.
- **Slash command id `2`** is unassigned (commands 1, 3, 4, 5 are live).
- **No README, no automated tests.** Add them before changes that materially expand the surface area; do not block on them for small fixes.

## When in doubt

- Architectural questions → [ARCHITECTURE.md](./ARCHITECTURE.md)
- Operational / "how do I recover from X" questions → [RUNBOOK.md](./RUNBOOK.md)
- Security questions / past findings → [SECURITY.md](./SECURITY.md) (append new findings; don't start a new file)
- Google Cloud / service account rationale → [docs/google-setup.md](./docs/google-setup.md)
- Schema questions → `src/db/schema.sql`
- Env questions → `.env.example`
- Anything else → ask the user; this is a small codebase, surface area is shallow.
