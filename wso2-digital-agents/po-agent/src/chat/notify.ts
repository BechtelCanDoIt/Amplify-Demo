// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// Sends a notification from another internal service (e.g. til-backend's new
// "Today I Learned" entries) to every DM Novera has with a person
// (agent_dm_spaces), whether or not they've connected their WSO2 account.
// Callers send plain text only; this module escapes it and owns the card.

import { listDmSpaces, removeDmSpace, type DmSpace } from "../db/dmSpaces";
import { chatAccessProblem, postNotificationMessage, type ChatSendResult } from "./proactive";

export interface Notification {
  source: string;
  title: string;
  body: string;
  subtitle?: string;
  link?: { url: string; label: string };
  footer?: string;
  iconUrl?: string;
  // A picture under the title, full width.
  imageUrl?: string;
  // A button under the body that opens url. Unlike link, it isn't part of the text.
  button?: { url: string; label: string };
}

const FIELDS = ["source", "title", "body", "subtitle", "link", "footer", "iconUrl", "imageUrl", "button"];
const SOURCE_PATTERN = /^[a-z0-9-]{1,40}$/;
const LINE_MAX_LENGTH = 300;
const BODY_MAX_LENGTH = 5000;
const LABEL_MAX_LENGTH = 40;
const URL_MAX_LENGTH = 2000;

// Chat wraps card text at roughly 90-95 characters, so this keeps the body
// to about 3 lines.
const BODY_PREVIEW_LENGTH = 240;
// bottomLabel is a single line that Chat clips at about 42 characters; cutting
// it here first keeps the cut at a word boundary.
const SUBTITLE_PREVIEW_LENGTH = 36;
const MUTED_TEXT_COLOR = "#5f6368";

// Sending is paced: at most SEND_CONCURRENCY cards in flight, and a new one
// started at most every SEND_INTERVAL_MS, i.e. ~20 a second or ~1,200 a minute.
// Google allows 3,000 message writes a minute per project, and Novera's normal
// replies (two writes each) share that, so a broadcast leaves them over half.
const SEND_CONCURRENCY = 10;
const SEND_INTERVAL_MS = 50;
// 429s, 5xx and no answer at all are retried up to MAX_RETRIES times (so a
// card is tried at most 4 times), with exponential backoff: ~1 s, 2 s, 4 s.
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30_000;
const MAX_RETRY_AFTER_MS = 60_000;
// Each DM that still fails, or is gone, gets one log line with its space and
// user ids, never a name or email. Failed DMs are capped per broadcast, so an
// outage across every DM doesn't flood the log. Removed DMs never are: their
// rows are deleted, so the log is the only record of who they were.
const MAX_FAILED_LOG_LINES = 100;

class InvalidNotification extends Error {}

function fail(message: string): never {
  throw new InvalidNotification(message);
}

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function readText(value: unknown, name: string, maxLength: number): string {
  if (isAbsent(value)) fail(`${name} is required.`);
  if (typeof value !== "string") fail(`${name} must be a string.`);
  const text = value.trim();
  if ([...text].length > maxLength) fail(`${name} must be ${maxLength} characters or fewer.`);
  return text;
}

function readUrl(value: unknown, name: string, protocols: string[]): string {
  if (typeof value !== "string" || value.length > URL_MAX_LENGTH) {
    fail(`${name} must be a URL of ${URL_MAX_LENGTH} characters or fewer.`);
  }
  let protocol = "";
  try {
    protocol = new URL(value).protocol;
  } catch {
    fail(`${name} must be a URL.`);
  }
  if (!protocols.includes(protocol)) fail(`${name} must be an ${protocols.join(" or ").replace(/:/g, "")} URL.`);
  return value;
}

// A {url, label} object: the "…Read more" link, or the button.
function readLink(value: unknown, name: string): { url: string; label: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${name} must be an object with url and label.`);
  const obj = value as Record<string, unknown>;
  const unknownField = Object.keys(obj).find((key) => key !== "url" && key !== "label");
  if (unknownField) fail(`Unknown field: ${name}.${unknownField}.`);
  return {
    url: readUrl(obj.url, `${name}.url`, ["http:", "https:"]),
    label: readText(obj.label, `${name}.label`, LABEL_MAX_LENGTH),
  };
}

function readNotification(input: unknown): Notification {
  if (typeof input !== "object" || input === null || Array.isArray(input)) fail("The body must be a JSON object.");
  const body = input as Record<string, unknown>;
  const unknownField = Object.keys(body).find((key) => !FIELDS.includes(key));
  if (unknownField) fail(`Unknown field: ${unknownField}.`);
  if (typeof body.source !== "string" || !SOURCE_PATTERN.test(body.source)) {
    fail("source must be 1-40 lowercase letters, digits or hyphens.");
  }

  const n: Notification = {
    source: body.source,
    title: readText(body.title, "title", LINE_MAX_LENGTH),
    body: readText(body.body, "body", BODY_MAX_LENGTH),
  };
  if (!isAbsent(body.subtitle)) n.subtitle = readText(body.subtitle, "subtitle", LINE_MAX_LENGTH);
  if (!isAbsent(body.footer)) n.footer = readText(body.footer, "footer", LINE_MAX_LENGTH);
  if (!isAbsent(body.iconUrl)) n.iconUrl = readUrl(body.iconUrl, "iconUrl", ["https:"]);
  if (!isAbsent(body.imageUrl)) n.imageUrl = readUrl(body.imageUrl, "imageUrl", ["https:"]);
  if (!isAbsent(body.link)) n.link = readLink(body.link, "link");
  if (!isAbsent(body.button)) n.button = readLink(body.button, "button");
  return n;
}

// The notification, or why it was rejected.
export function parseNotification(input: unknown): Notification | string {
  try {
    return readNotification(input);
  } catch (err) {
    if (err instanceof InvalidNotification) return err.message;
    throw err;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Cuts at the last space within maxLength characters, never mid-word.
// Returns text itself when it already fits.
function cutAtWord(text: string, maxLength: number): string {
  const chars = [...text];
  if (chars.length <= maxLength) return text;
  const cut = chars.slice(0, maxLength).join("");
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function buildCard(n: Notification): { cardsV2: object[] } {
  const body = n.body.replace(/\s+/g, " ");
  const preview = cutAtWord(body, BODY_PREVIEW_LENGTH);
  // Without a link, a bare "…" still shows that the preview was cut short.
  const more = n.link
    ? ` <a href="${escapeHtml(n.link.url)}">…${escapeHtml(n.link.label)}</a>`
    : preview !== body ? "…" : "";

  let subtitle: string | undefined;
  if (n.subtitle) {
    const cut = cutAtWord(n.subtitle, SUBTITLE_PREVIEW_LENGTH);
    subtitle = cut === n.subtitle ? cut : `${cut}…`;
  }

  const widgets: object[] = [
    {
      decoratedText: {
        ...(n.iconUrl ? { startIcon: { iconUrl: n.iconUrl } } : {}),
        text: `<b>${escapeHtml(n.title)}</b>`,
        wrapText: true,
        // bottomLabel is plain text, so it isn't escaped.
        ...(subtitle ? { bottomLabel: subtitle } : {}),
      },
    },
    { divider: {} },
  ];
  if (n.imageUrl) widgets.push({ image: { imageUrl: n.imageUrl, altText: n.title } });
  widgets.push({ textParagraph: { text: `${escapeHtml(preview)}${more}` } });
  if (n.button) {
    widgets.push({
      buttonList: { buttons: [{ text: n.button.label, onClick: { openLink: { url: n.button.url } } }] },
    });
  }
  if (n.footer) {
    widgets.push(
      { divider: {} },
      { textParagraph: { text: `<font color="${MUTED_TEXT_COLOR}">${escapeHtml(n.footer)}</font>` } },
    );
  }
  return {
    cardsV2: [{ cardId: `notification-${n.source}`, card: { sections: [{ widgets }] } }],
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Google's Retry-After (in seconds) when it gives one and it's longer.
function retryDelayMs(attempt: number, retryAfter?: string): number {
  const backoff = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (attempt - 1)) + Math.random() * 500;
  const seconds = Number(retryAfter);
  return seconds > 0 ? Math.max(backoff, Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)) : backoff;
}

// Best effort: a card that still can't be delivered after the retries is
// counted and skipped. A 404 means the DM is gone, so it's removed from
// agent_dm_spaces; anything else (e.g. a 403 admin restriction) is kept, as
// that person may be allowed again. Each removed DM is logged, and each failed
// one up to MAX_FAILED_LOG_LINES, then one summary per broadcast. If Novera
// can't get a Google token at all, nothing is attempted.
export async function broadcastNotification(n: Notification): Promise<void> {
  const started = Date.now();
  const targets = await listDmSpaces();
  const card = buildCard(n);
  const problem = await chatAccessProblem();
  if (problem) {
    console.error(`[notify] source=${n.source} not sent to ${targets.length} DMs: ${problem}`);
    return;
  }
  console.log(`[notify] source=${n.source} sending to ${targets.length} DMs`);

  let nextStart = 0;
  const pace = async () => {
    const now = Date.now();
    const wait = Math.max(0, nextStart - now);
    nextStart = Math.max(now, nextStart) + SEND_INTERVAL_MS;
    if (wait > 0) await sleep(wait);
  };

  const counts = { sent: 0, failed: 0, retried: 0, removed: 0 };
  const failures = new Map<string, number>();
  let failedLines = 0;
  const logDm = (outcome: "failed" | "removed", dm: DmSpace, reason: string) => {
    if (outcome === "failed" && ++failedLines > MAX_FAILED_LOG_LINES) return;
    console.log(`[notify] source=${n.source} ${outcome} ${dm.spaceName} ${dm.googleUserId ?? "users/unknown"} (${reason})`);
  };
  const send = async (dm: DmSpace) => {
    const { spaceName } = dm;
    for (let attempt = 1; ; attempt++) {
      await pace();
      // A throw here is the token fetch failing mid-broadcast: worth a retry.
      const result: ChatSendResult = await postNotificationMessage(spaceName, card).catch((err) => ({
        ok: false as const,
        retryable: true,
        reason: String(err?.message ?? err),
      }));
      if (result.ok) {
        counts.sent++;
        return;
      }
      if (result.retryable && attempt <= MAX_RETRIES) {
        counts.retried++;
        await sleep(retryDelayMs(attempt, result.retryAfter));
        continue;
      }
      counts.failed++;
      const key = `${result.status ?? "no answer"}: ${result.reason}`;
      failures.set(key, (failures.get(key) ?? 0) + 1);
      if (result.status === 404) {
        await removeDmSpace(spaceName);
        counts.removed++;
        logDm("removed", dm, key);
      } else {
        logDm("failed", dm, key);
      }
      return;
    }
  };

  let next = 0;
  const worker = async () => {
    while (next < targets.length) await send(targets[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(SEND_CONCURRENCY, targets.length) }, worker));
  if (failedLines > MAX_FAILED_LOG_LINES) {
    console.log(`[notify] source=${n.source} …and ${failedLines - MAX_FAILED_LOG_LINES} more failed DMs, not listed`);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[notify] source=${n.source} sent=${counts.sent} failed=${counts.failed} retried=${counts.retried} removed=${counts.removed} in ${seconds}s`,
  );
  const top = [...failures].sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [reason, count] of top) console.log(`[notify] source=${n.source} ${count} failed with ${reason}`);
}
