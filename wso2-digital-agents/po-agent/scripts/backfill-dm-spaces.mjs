#!/usr/bin/env node
// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// One-off backfill of Novera's agent_dm_spaces table.
//
// Lists every 1:1 DM that Novera's Google Chat app has with a person, looks up
// that person, and writes two files. It never writes to Google or to a database.
//
//   dm-spaces-<env>.sql  Run it against Novera's MySQL. It creates
//                        agent_dm_spaces if needed, then adds every DM whose
//                        person was found. Safe to run more than once.
//   dm-spaces-<env>.csv  Every DM: space_name, google_user_id, display_name,
//                        imported (yes/no), lookup ("ok" or why it failed).
//
// A DM whose lookup fails is left out of the SQL: if Google won't let Novera
// read its members (e.g. an admin policy), Novera can't post there either. A
// failure that was only temporary is picked up by running the script again.
//
// Needs Node.js 18 or newer (nothing to install) and Novera's service-account
// key for that environment: the JSON in its GOOGLE_SERVICE_ACCOUNT_KEY setting.
//
//   node backfill-dm-spaces.mjs --key novera-sa.json --env staging [--out-dir .]
//
// Both output files hold employees' names and Chat ids. Don't commit them, and
// share them only with whoever needs the report.

import { createSign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CHAT_API = "https://chat.googleapis.com/v1";
const SCOPE = "https://www.googleapis.com/auth/chat.bot";
const SPACE_NAME = /^spaces\/[A-Za-z0-9_-]+$/;
const USER_NAME = /^users\/[0-9A-Za-z_-]+$/;
const ENV_NAME = /^[a-z0-9-]{1,20}$/;
const LOOKUP_CONCURRENCY = 5;
const MAX_TRIES = 5;
const SQL_CHUNK = 500;

// Same definition as src/db/schema.sql.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS agent_dm_spaces (
    space_name      VARCHAR(255) PRIMARY KEY,
    google_user_id  VARCHAR(255),
    display_name    VARCHAR(255),
    email           VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_google_user_id (google_user_id)
);`;


const USAGE = `Usage: node backfill-dm-spaces.mjs --key <service-account.json> --env <name> [--out-dir <dir>]

  --key      Novera's service-account key file for this environment. Instead,
             GOOGLE_SERVICE_ACCOUNT_KEY can hold the key's JSON.
  --env      A short name for the environment, e.g. staging or prod. Used in
             the output file names.
  --out-dir  Where to write dm-spaces-<env>.sql and dm-spaces-<env>.csv
             (default: the current folder). Keep them, and the key, outside
             any git repository.`;

class Fatal extends Error {}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(message) {
  throw new Fatal(message);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArguments(argv) {
  const args = { outDir: "." };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i] ?? fail(`${arg} needs a value.\n\n${USAGE}`);
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--key") args.key = value();
    else if (arg === "--env") args.env = value();
    else if (arg === "--out-dir") args.outDir = value();
    else fail(`Unknown argument: ${arg}\n\n${USAGE}`);
  }
  return args;
}

function loadKey(path) {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (path) {
    try {
      raw = readFileSync(path, "utf8");
    } catch (err) {
      fail(`Can't read the key file ${path}: ${err.message}`);
    }
  }
  if (!raw) fail(`Pass --key <service-account.json>, or set GOOGLE_SERVICE_ACCOUNT_KEY.\n\n${USAGE}`);
  let key;
  try {
    key = JSON.parse(raw);
  } catch {
    fail("The service-account key isn't valid JSON.");
  }
  if (!key.client_email || !key.private_key) fail("The service-account key has no client_email or private_key.");
  return { email: key.client_email, privateKey: key.private_key, tokenUri: key.token_uri || "https://oauth2.googleapis.com/token" };
}

const base64url = (data) => Buffer.from(data).toString("base64url");

// Signs a service-account JWT and exchanges it for an access token.
async function fetchAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({ iss: key.email, scope: SCOPE, aud: key.tokenUri, iat: now, exp: now + 3600 }),
  )}`;
  let signature;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(key.privateKey).toString("base64url");
  } catch {
    fail("Can't sign with the key's private_key; check that the key file is complete.");
  }
  const res = await fetch(key.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    fail(`Google didn't accept the service-account key (HTTP ${res.status}${body.error ? `, ${body.error}` : ""}).`);
  }
  return body.access_token;
}

function query(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// A GET against the Chat API. 429 and 5xx are retried with exponential
// backoff; a 401 gets one fresh token. Tokens are renewed after 50 minutes.
function chatApi(key) {
  let token = null;
  let renewAt = 0;
  const accessToken = async (renew) => {
    if (renew || !token || Date.now() >= renewAt) {
      token = await fetchAccessToken(key);
      renewAt = Date.now() + 50 * 60 * 1000;
    }
    return token;
  };
  return async function get(path, params) {
    const url = `${CHAT_API}/${path}?${query(params)}`;
    let renewed = false;
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken(false)}` } });
      if (res.ok) return res.json();
      if (res.status === 401 && !renewed) {
        renewed = true;
        await accessToken(true);
        continue;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_TRIES) {
        await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 250);
        continue;
      }
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error?.message ?? res.statusText);
    }
  };
}

async function listDirectMessages(get) {
  const names = new Set();
  let pageToken;
  do {
    const page = await get("spaces", {
      filter: 'spaceType = "DIRECT_MESSAGE"',
      pageSize: "1000",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const space of page.spaces ?? []) {
      if (space.singleUserBotDm !== true) continue;
      if (!SPACE_NAME.test(space.name ?? "")) fail(`Unexpected space name ${JSON.stringify(space.name)}; nothing was written.`);
      names.add(space.name);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return [...names];
}

async function lookUpPerson(get, space) {
  try {
    const page = await get(`${space}/members`, { filter: 'member.type = "HUMAN"', pageSize: "10" });
    const person = (page.memberships ?? []).map((m) => m.member).find((m) => m?.name?.startsWith("users/"));
    if (!person) return { space, lookup: "no person returned" };
    if (!USER_NAME.test(person.name)) fail(`Unexpected user id ${JSON.stringify(person.name)} in ${space}; nothing was written.`);
    return { space, googleUserId: person.name, displayName: person.displayName ?? "", lookup: "ok" };
  } catch (err) {
    if (err instanceof ApiError) return { space, lookup: `HTTP ${err.status}: ${err.message}` };
    throw err;
  }
}

async function inParallel(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
      if ((i + 1) % 100 === 0) process.stderr.write(`  looked up ${i + 1} of ${items.length}\n`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Ids are checked against SPACE_NAME / USER_NAME before they get here.
const sqlId = (s) => (s ? `'${s}'` : "NULL");
// Hex needs no escaping, whatever the server's SQL mode.
const sqlText = (s) => (s ? `CONVERT(X'${Buffer.from(s, "utf8").toString("hex")}' USING utf8mb4)` : "NULL");

function toSql(rows, total, env) {
  const out = [
    `-- agent_dm_spaces backfill for ${env}: ${rows.length} of ${total} DMs, generated`,
    `-- ${new Date().toISOString()} by backfill-dm-spaces.mjs. DMs whose person couldn't be`,
    "-- looked up are left out; the CSV lists them and why. Safe to run more than",
    "-- once: rows that exist only gain values they're missing.",
    "",
    CREATE_TABLE,
    "",
  ];
  for (let i = 0; i < rows.length; i += SQL_CHUNK) {
    const values = rows
      .slice(i, i + SQL_CHUNK)
      .map((r) => `  (${sqlId(r.space)}, ${sqlId(r.googleUserId)}, ${sqlText(r.displayName)})`);
    out.push(
      "INSERT INTO agent_dm_spaces (space_name, google_user_id, display_name) VALUES",
      values.join(",\n"),
      "ON DUPLICATE KEY UPDATE",
      "  google_user_id = COALESCE(google_user_id, VALUES(google_user_id)),",
      "  display_name   = COALESCE(display_name, VALUES(display_name));",
      "",
    );
  }
  return out.join("\n");
}

// RFC 4180, and a leading ' on anything a spreadsheet would run as a formula.
function csvCell(value) {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const lines = ["space_name,google_user_id,display_name,imported,lookup"];
  for (const r of rows) {
    const imported = r.lookup === "ok" ? "yes" : "no";
    lines.push([r.space, r.googleUserId, r.displayName, imported, r.lookup].map(csvCell).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

async function main() {
  if (typeof fetch !== "function") fail("This script needs Node.js 18 or newer.");
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (!args.env || !ENV_NAME.test(args.env)) fail(`Pass --env with a short name such as staging or prod.\n\n${USAGE}`);
  const key = loadKey(args.key);
  const get = chatApi(key);

  console.log(`Listing the DMs that ${key.email} is in…`);
  const spaces = await listDirectMessages(get);
  console.log(`Found ${spaces.length} DMs. Looking up the person in each…`);
  const rows = await inParallel(spaces, LOOKUP_CONCURRENCY, (space) => lookUpPerson(get, space));
  rows.sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? "") || a.space.localeCompare(b.space));

  const sqlPath = join(args.outDir, `dm-spaces-${args.env}.sql`);
  const csvPath = join(args.outDir, `dm-spaces-${args.env}.csv`);
  const imported = rows.filter((r) => r.lookup === "ok");
  writeFileSync(sqlPath, toSql(imported, rows.length, args.env), { mode: 0o600 });
  writeFileSync(csvPath, toCsv(rows), { mode: 0o600 });

  const skipped = rows.length - imported.length;
  console.log(`${rows.length} DMs: ${imported.length} in the SQL, ${skipped} skipped because the person couldn't be looked up.`);
  if (skipped) console.log("The CSV's lookup column says why. Run the script again later to pick up any that failed only temporarily.");
  console.log(`Wrote ${sqlPath} and ${csvPath}.`);
}

main().catch((err) => {
  if (err instanceof Fatal) {
    console.error(err.message);
  } else if (err instanceof ApiError) {
    console.error(`The Chat API refused the request (HTTP ${err.status}): ${err.message}. Nothing was written.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
