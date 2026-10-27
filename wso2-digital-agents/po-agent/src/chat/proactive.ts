// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import { GoogleAuth, AuthClient } from "google-auth-library";
import axios from "axios";
import { config } from "../config";
import { recordThread } from "../db/threads";

// Module-level auth client. Created lazily on first use; google-auth-library
// caches the access token internally and refreshes when expired, so re-using
// one client across calls is cheaper than `new GoogleAuth()` per send. The
// promise is cached, not the client, so a burst of first sends (e.g. a
// notification on a fresh pod) shares one client instead of each making its own.
let authClient: Promise<AuthClient> | null = null;

// Every Chat API call gives up after this long rather than hanging.
const CHAT_API_TIMEOUT_MS = 15_000;

async function getAccessToken(): Promise<string | null> {
  if (!config.googleChat.serviceAccountKey) {
    console.warn("[proactive] GOOGLE_SERVICE_ACCOUNT_KEY not configured — skipping Chat API call");
    return null;
  }
  if (!authClient) {
    const auth = new GoogleAuth({
      credentials: JSON.parse(config.googleChat.serviceAccountKey),
      scopes: ["https://www.googleapis.com/auth/chat.bot"],
    });
    authClient = auth.getClient().catch((err) => {
      authClient = null; // let the next call try again
      throw err;
    });
  }
  const { token } = await (await authClient).getAccessToken();
  return token ?? null;
}

// Body for a Chat "Connect with Asgardeo" card. The greeting sits above the
// button as a textParagraph inside the card itself; we deliberately do NOT
// also set a top-level `text` field, because Chat renders text + cardsV2 as
// two separate bubbles, which surfaces the raw auth URL alongside the button
// — defeating the point of the card. Modern Chat clients (web, mobile, all
// recent versions) render cardsV2 natively, so no plain-text fallback is
// needed.
export function authPromptCard(greeting: string, authUrl: string): { cardsV2: object[] } {
  return {
    cardsV2: [
      {
        cardId: "novera-auth-card",
        card: {
          sections: [
            {
              widgets: [
                { textParagraph: { text: greeting } },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "Connect with Asgardeo",
                        onClick: { openLink: { url: authUrl } },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// Acceptable message-body shapes for postMessage / updateMessage / proactive
// senders. Either a plain string (treated as text) or a structured object
// carrying any combination of text + cardsV2.
export type ChatBody = string | { text?: string; cardsV2?: object[] };

function toBody(input: ChatBody): { text?: string; cardsV2?: object[] } {
  return typeof input === "string" ? { text: input } : input;
}

// Internal helper — POST a new message to a Chat space. Returns the created
// message's name (e.g. "spaces/AAA/messages/BBB.CCC") on success, null on
// any failure (auth issue, network, API rejection).
//
// When `threadName` is supplied, the message is anchored to that thread (the
// `spaces/.../threads/...` resource the inbound webhook carried) so the reply
// appears inline with the user's message instead of as a new top-level entry
// in the space. `messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD` makes
// the call safe against a stale thread reference: if the thread no longer
// exists, Chat falls back to creating a new top-level message rather than 4xx.
//
// On success, the response's thread.name is recorded in agent_known_threads so
// the next webhook in that thread is recognised as a reply-in-existing-thread.
// This is how the bot "remembers" the threads it has been in — Chat's API does
// not expose that information in DM spaces without admin approval.
async function postMessage(
  spaceName: string,
  content: ChatBody,
  threadName?: string,
): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const url = threadName
      ? `https://chat.googleapis.com/v1/${spaceName}/messages?messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`
      : `https://chat.googleapis.com/v1/${spaceName}/messages`;
    const body: Record<string, unknown> = { ...toBody(content) };
    if (threadName) body.thread = { name: threadName };
    const resp = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: CHAT_API_TIMEOUT_MS,
    });
    const respThreadName = resp.data?.thread?.name;
    if (respThreadName) {
      // Don't await — recording is best-effort and shouldn't block the reply.
      void recordThread(spaceName, respThreadName);
    }
    return resp.data?.name ?? null;
  } catch (err: any) {
    console.error("[proactive] postMessage failed:", err?.response?.data ?? err?.message);
    return null;
  }
}

/**
 * Sends a text message to a Google Chat space using the bot's service account.
 * Used for proactive messages after OAuth completion when there's no active
 * webhook response to reply through (the browser redirect closed it).
 *
 * If the original user message was sent in a thread, pass `threadName` so the
 * proactive reply lands in that same thread rather than the space's main view.
 *
 * Resolves to whether Chat accepted the message.
 */
export async function sendProactiveMessage(
  spaceName: string,
  content: ChatBody,
  threadName?: string,
): Promise<boolean> {
  return (await postMessage(spaceName, content, threadName)) !== null;
}

export type ChatSendResult =
  | { ok: true }
  | { ok: false; retryable: boolean; status?: number; retryAfter?: string; reason: string };

// Why Novera can't call the Chat API at all, or undefined if it can. A
// broadcast checks this first rather than failing every card the same way.
export async function chatAccessProblem(): Promise<string | undefined> {
  try {
    return (await getAccessToken()) ? undefined : "GOOGLE_SERVICE_ACCOUNT_KEY not configured";
  } catch (err: any) {
    return `can't get a Google access token: ${err?.message ?? err}`;
  }
}

// Posts a notification card as a new top-level message: one attempt, with the
// outcome returned for the caller to retry or count. Unlike sendProactiveMessage,
// the card's thread isn't recorded in agent_known_threads, because a
// notification isn't a conversation.
export async function postNotificationMessage(spaceName: string, content: ChatBody): Promise<ChatSendResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, retryable: false, reason: "GOOGLE_SERVICE_ACCOUNT_KEY not configured" };
  try {
    await axios.post(`https://chat.googleapis.com/v1/${spaceName}/messages`, toBody(content), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: CHAT_API_TIMEOUT_MS,
    });
    return { ok: true };
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    return {
      ok: false,
      // No answer at all (network error, timeout), a 429 or a 5xx may pass.
      retryable: status === undefined || status === 429 || status >= 500,
      status,
      retryAfter: err?.response?.headers?.["retry-after"],
      reason: String(err?.response?.data?.error?.message ?? err?.message ?? err?.code ?? err),
    };
  }
}

/**
 * Sends a placeholder message (e.g., "⏳ Working on it...") to a Chat space
 * and returns the message's resource name, which can later be passed to
 * `updateMessage()` to replace the placeholder text in place.
 *
 * Used by the async-reply flow: the webhook ACKs immediately, this posts the
 * "typing..." indicator, the agent processes the request in the background,
 * and the placeholder is updated with the real answer when ready. Two API
 * calls instead of one, but the user sees feedback within ~500 ms and the
 * webhook timeout pressure that causes duplicate-reply retries goes away.
 *
 * Pass `threadName` to keep the placeholder (and therefore the eventual
 * updated reply) in the same thread as the user's message — `updateMessage`
 * PATCHes the message in place, so the thread anchor doesn't need to be
 * repeated on the update call.
 */
export async function sendPlaceholderMessage(
  spaceName: string,
  text: string,
  threadName?: string,
): Promise<string | null> {
  // Placeholder is always plain text ("⏳ Working on it...") — typed narrowly
  // here so callers don't accidentally start with a card placeholder.
  return postMessage(spaceName, text, threadName);
}

/**
 * Updates an existing Chat message's text in place. Used to replace a placeholder
 * ("⏳ Working on it...") with the actual reply once the agent finishes processing.
 *
 * `messageName` is the resource name returned by `sendPlaceholderMessage()` /
 * `sendProactiveMessage()` — e.g. "spaces/AAA/messages/BBB.CCC".
 */
export async function updateMessage(messageName: string, content: ChatBody): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const body = toBody(content);
    // updateMask must list each field we're touching. When swapping a text
    // placeholder for a card we send both text + cardsV2, so the mask covers
    // both — otherwise the placeholder text would stick around alongside the
    // card.
    const mask: string[] = [];
    if ("text" in body) mask.push("text");
    if ("cardsV2" in body) mask.push("cardsV2");
    if (mask.length === 0) return true;
    await axios.patch(
      `https://chat.googleapis.com/v1/${messageName}?updateMask=${mask.join(",")}`,
      body,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, timeout: CHAT_API_TIMEOUT_MS }
    );
    return true;
  } catch (err: any) {
    console.error("[proactive] updateMessage failed:", err?.response?.data ?? err?.message);
    return false;
  }
}
