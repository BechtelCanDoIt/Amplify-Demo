// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { config, DEFAULT_ANTHROPIC_BASE_URL } from "./config";
import { GoogleChatEvent, ChatUser } from "./types";
import { processMessage } from "./agent/claude";
import { generateAuthUrl, handleCallback, deleteStaleOAuthStates, getValidIdToken } from "./auth/oauth";
import { sendProactiveMessage, sendPlaceholderMessage, updateMessage, authPromptCard, chatAccessProblem, type ChatBody } from "./chat/proactive";
import { isThreadKnown, recordThread, purgeOldThreads } from "./db/threads";
import { getToken } from "./db/tokens";
import { trackDmSpace } from "./chat/dmSpaces";
import { broadcastNotification, parseNotification } from "./chat/notify";
import { getMyLocation, isSriLankaLocation } from "./tools/employee";
import { startPolicySync } from "./policy/sync";
import { startTrainingSync } from "./training/sync";

const app = express();

// Choreo (and most cloud platforms) sit behind a reverse proxy that sets
// X-Forwarded-For. Trust the first proxy so rate limiting and IP detection work correctly.
// Gated on TRUST_PROXY so direct-exposure deployments don't accept spoofed headers.
app.set("trust proxy", config.trustProxy ? 1 : false);

app.use(helmet());

// Global rate limit — first line of defense against floods. Runs before any
// body parsing or JWT verification so anonymous abuse can't burn CPU on those.
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
}));

// Per-user rate limit on the webhook — keyed by Google User ID extracted from
// the parsed request body. Mounted AFTER verifyChatRequest so unauthenticated
// callers can't fan-out across spoofed user names to bypass the per-user cap.
// Falls back to IP if the user field is absent (e.g. malformed payloads).
const webhookUserRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests per minute per Google user
  keyGenerator: (req) => req.body?.chat?.user?.name ?? req.ip ?? "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// IP-keyed rate limit for the OAuth callback — no user identity is established
// at this point, so we cap by IP to bound DB load and Asgardeo token-exchange spend.
const authCallbackRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip ?? "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// ─── Google Chat JWT Verification ─────────────────────────────────────────

const googleAuthClient = new OAuth2Client();

async function verifyChatRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: token,
      audience: config.googleChat.webhookAudience,
    });
    const payload = ticket.getPayload();

    // For future webhook-auth debugging — uncomment to log iss/email/aud from valid Google-signed tokens:
    // console.log("[auth-debug] iss:", payload?.iss, "| email:", payload?.email, "| aud:", payload?.aud);

    // Pin issuer and exact caller SA — verifyIdToken already checks signature + audience,
    // this stops a different SA in the gsuiteaddons domain from being accepted.
    if (payload?.iss !== "https://accounts.google.com") {
      console.error("[auth] Invalid token issuer:", payload?.iss);
      res.status(401).json({ error: "Invalid token issuer" });
      return;
    }
    if (payload?.email !== config.googleChat.webhookCallerEmail) {
      console.error("[auth] Invalid token caller:", payload?.email);
      res.status(401).json({ error: "Invalid token caller" });
      return;
    }

    next();
  } catch (err) {
    console.error("[auth] Token verification failed:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

// Resolves whether the inbound message was sent inside a thread the bot has
// seen / posted in before. If yes → bot anchors its reply there; if no →
// don't anchor (Chat auto-houses every top-level message in a fresh thread,
// so anchoring would turn a "hi" into a 2-message thread).
//
// Why DB rather than Chat API: spaces.messages.list returns 400 in DM spaces
// without Workspace admin approval ("DMs are not supported for methods
// requiring app authentication with administrator approval"). We track known
// threads ourselves in agent_known_threads instead.
//
// Always records the inbound thread.name on the way out, regardless of the
// anchoring decision — so a user's follow-up reply in the same thread will
// be recognised next time.
async function resolveAnchorThread(spaceName: string, threadName: string | undefined): Promise<string | undefined> {
  if (!threadName) return undefined;
  const known = await isThreadKnown(spaceName, threadName);
  console.log("[thread]", { spaceName, threadName, known });
  // Record asynchronously — best-effort, doesn't block the chat path.
  void recordThread(spaceName, threadName);
  return known ? threadName : undefined;
}

// ─── Google Chat Webhook ───────────────────────────────────────────────────

// express.json() is scoped to this route — /health and /auth/callback have no
// JSON body, so they skip the parser entirely. Mounted after verifyChatRequest
// so unauthenticated requests are rejected before paying the body-parse cost.
//
// 16 KB cap: sized to fit real Google Chat Workspace Add-on event payloads
// with comfortable headroom. The envelope alone is typically 2–5 KB (rich
// commonEventObject, chat.user object repeated across sender fields, full
// space metadata, timestamps, opaque resource names). Group spaces and
// OAuth-token-carrying payloads push higher. An earlier 4 KB cap was too
// tight and false-positived on plain-text turns like "/help" and short
// policy questions. 16 KB is still ~3× tighter than the historical 50 KB —
// preserving the DoS-surface hardening intent — while safely covering any
// legitimate payload Google Chat sends.
//
// Over-limit requests throw PayloadTooLargeError from express.json BEFORE the
// route handler runs, so the in-handler attachment guard never sees them.
// Body parsing failed, so req.body is empty — we genuinely cannot tell whether
// the user hit the cap with an attachment or with a really long text message.
// Reply with a neutral message that covers both cases. (The in-handler
// attachment guard handles the case where parsing succeeded but the payload
// contained an attachment field — that path uses a more specific message.)
// Other errors fall through to Express's default handler.
const webhookErrorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if ((err as { type?: string } | null)?.type === "entity.too.large") {
    // Log the actual payload size so a future tightening/loosening decision
    // has real data behind it, not an estimate. `length` is the express body
    // parser's own field indicating how many bytes it saw before giving up.
    const size = (err as { length?: number } | null)?.length;
    console.log("[webhook] rejecting oversized payload — content-length:", size ?? "unknown", "bytes");
    return res.json(chatReply(
      "Sorry, your message is too large for me to process. I'm a text-only assistant — please keep messages short and don't attach files (images, PDFs, documents, etc.).",
    ));
  }
  return next(err);
};

app.post("/webhook", verifyChatRequest, express.json({ limit: "16kb" }), webhookErrorHandler, webhookUserRateLimit, async (req: Request, res: Response) => {
  const event: GoogleChatEvent = req.body;
  const { messagePayload, addedToSpacePayload, removedFromSpacePayload, user: chatUser } = event.chat ?? {};

  console.log("[webhook] hostApp:", event.commonEventObject?.hostApp,
    "| hasMessage:", !!messagePayload, "| hasAddedToSpace:", !!addedToSpacePayload,
    "| hasRemovedFromSpace:", !!removedFromSpacePayload);

  // Keeps agent_dm_spaces current (added to a DM, any message in one, removed)
  // so notifications reach everyone who has Novera. Fire-and-forget: must
  // never add latency to the webhook's own ACK.
  void trackDmSpace(event);

  if (addedToSpacePayload) {
    return res.json(chatReply(
      "Hi! I'm Novera, WSO2's internal AI agent. Just tell me what you need in plain English — "
      + "for example, \"apply casual leave for tomorrow\", \"what's our work-from-home policy?\", "
      + "or \"I need a visa letter\". Type \"help\" any time to see everything I can do.",
    ));
  }
  if (!messagePayload) {
    return res.json({});
  }

  const { message } = messagePayload;

  // Reject any attachment up-front. The bot has no attachment-handling tools,
  // so any upload would be silently dropped by the LLM path; rejecting here
  // gives the user a clear answer instead.
  if (message.attachment && message.attachment.length > 0) {
    console.log("[webhook] rejecting message with", message.attachment.length, "attachment(s) from", chatUser.email);
    return res.json(chatReply(
      "Sorry, I can't process file attachments (images, PDFs, documents, etc.). I'm a text-only assistant — please describe what you need in words instead.",
    ));
  }

  // Hold the RAW thread.name on the user object. Whether we actually anchor
  // replies to that thread (vs let them land in main section) is decided
  // per-action by resolveAnchorThread(), which calls the Chat API to see if
  // the thread has prior messages. Doing it here would block the webhook ACK.
  const user: ChatUser = {
    googleUserId: chatUser.name,       // e.g. "users/123456789"
    displayName: chatUser.displayName,
    email: chatUser.email,
    spaceName: messagePayload.space.name, // e.g. "spaces/XXXXXXXX"
    threadName: message.thread?.name,     // raw — resolve before anchoring
  };

  const slashCommand = message.slashCommand;
  const argumentText = (message.argumentText || "").trim();
  const messageText = (message.text || "").trim();

  try {
    // ── Slash commands ───────────────────────────────────────────────────
    if (slashCommand) {
      switch (slashCommand.commandId) {
        case "1": { // /leave — slow (LLM); async-reply with placeholder
          const prompt = argumentText
            ? `Apply for leave: ${argumentText}`
            : "I want to apply for leave.";
          setImmediate(() => { void asyncReply(user, prompt); });
          return res.json({});
        }
        case "3": { // /status — slow (LLM); async-reply with placeholder
          setImmediate(() => { void asyncReply(user, "Show my pending requests."); });
          return res.json({});
        }
        case "4": { // /connect — fast (DB write only), reply synchronously
          // Resolve whether to anchor the post-OAuth welcome to a thread.
          // Persisting the raw thread.name would thread the welcome under a
          // top-level /connect message — same bug as on inbound replies.
          const anchorThread = await resolveAnchorThread(user.spaceName, user.threadName);
          const authUrl = await generateAuthUrl(user.googleUserId, {
            spaceName: user.spaceName,
            threadName: anchorThread,
            displayName: user.displayName,
            userEmail: user.email,
          });
          return res.json(chatReply(authPromptCard(
            "Click the button below to connect your WSO2 account.",
            authUrl,
          )));
        }
        case "5": { // /help — fast (static + one cheap location check), reply synchronously
          const isSL = await resolveIsSriLanka(user.googleUserId);
          return res.json(chatReply(helpText(isSL)));
        }
        default:
          return res.json(chatReply(helpText()));
      }
    }

    // ── Free-form message — slow (LLM); async-reply with placeholder ────
    setImmediate(() => { void asyncReply(user, messageText); });
    return res.json({});

  } catch (err) {
    console.error("Webhook error:", err);
    return res.json(chatReply("Sorry, something went wrong. Please try again."));
  }
});

// ─── OAuth Callback ────────────────────────────────────────────────────────

app.get("/auth/callback", authCallbackRateLimit, async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code || !state) {
    return res.status(400).send("Authentication failed. You can close this tab.");
  }

  try {
    const { token, context } = await handleCallback(code, state);
    console.log(`User connected: ${token.wso2Email} (Google: ${token.googleUserId})`);

    const safeEmail = token.wso2Email
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // Per-response CSP nonce — lets us inline a tiny script that handles the
    // "Close this tab" button without weakening the bot's global script-src.
    // window.close() only succeeds when the browser opened this tab via a
    // script or link from another tab (the Google Chat case here), so we also
    // surface a manual-close hint if it silently fails.
    const nonce = randomBytes(16).toString("base64");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
    );
    res.send(
      `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>Connected!</h2>
        <p>Your WSO2 account (<strong>${safeEmail}</strong>) is now linked to Novera.</p>
        <p>You can close this tab — I'll continue your request in Google Chat.</p>
        <button id="closeBtn" style="margin-top:16px;padding:10px 24px;font-size:14px;border:none;background:#1a73e8;color:#fff;border-radius:4px;cursor:pointer">Close this tab</button>
        <p id="closeFallback" style="display:none;margin-top:12px;color:#666;font-size:13px">Your browser blocked auto-close. Please close this tab with &#8984;W (Mac) or Ctrl+W (Windows).</p>
        <script nonce="${nonce}">
          document.getElementById('closeBtn').addEventListener('click', function() {
            window.close();
            setTimeout(function() {
              document.getElementById('closeFallback').style.display = 'block';
            }, 250);
          });
        </script>
      </body></html>`
    );

    // Process the original request and post the reply to Chat.
    // Runs in a detached async block so any error here never touches res.
    if (context.spaceName) {
      const chatUser: ChatUser = {
        googleUserId: token.googleUserId,
        displayName: context.displayName ?? token.wso2Email,
        email: context.userEmail ?? token.wso2Email,
        spaceName: context.spaceName,
        threadName: context.threadName,
      };
      const spaceName = context.spaceName;
      const threadName = context.threadName;
      const originalMessage = context.originalMessage;

      setImmediate(async () => {
        try {
          let replyText: string;
          if (originalMessage) {
            replyText = await processMessage(chatUser, originalMessage);
          } else {
            // Welcome message with location-aware capability list.
            const isSL = await resolveIsSriLanka(token.googleUserId);
            const leaveCapabilities = `- Apply for leave (casual, sick, annual, lieu, maternity, paternity)
- View leave history or cancel a leave request
- Ask PO policy questions (leave entitlements, benefits, work-from-home, etc.)
- Ask WSO2 training & certification questions (programs, exams, badges, escalation contacts)
- Look up scheduled engineering releases (this week or next week, optionally by team)
- Request letters from PO (employment confirmation, visa, salary, passport renewal, etc.)
- Report bugs / check status of issues you've reported`;
            const sriLankaCapabilities = `
- Check today's menu
- Register, list, or delete your vehicles`;
            const extras = isSL === false
              ? `\n\nNote: Menu lookup and vehicle registration are only available to employees based in Sri Lanka.`
              : sriLankaCapabilities;
            replyText = `Hi! Your WSO2 account is now connected. Here's what I can help you with:\n\n${leaveCapabilities}${extras}\n\nWhat would you like to do?`;
          }
          await sendProactiveMessage(spaceName, replyText, threadName);
        } catch (err) {
          console.error("[proactive] Post-auth message failed:", err);
        }
      });
    }
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.error_description || err.message;
    // Stale or already-used state: the link from chat was clicked twice, the
    // callback page was refreshed, or the user is reusing an old auth button
    // after a prior connection succeeded. Don't tell them to "try again in a
    // few minutes" — that won't help. Tell them to start a new flow.
    if (err.message === "Invalid or expired OAuth state") {
      res.status(400).send(
        "This authentication link has already been used or has expired. "
        + "Please go back to Google Chat and send any message to Novera to get a fresh connect link.",
      );
    } else if (status === 401 || status === 403) {
      res.status(400).send("Your session expired or the authorization was denied. Please try logging in again.");
    } else {
      console.error("OAuth callback detail:", detail);
      res.status(500).send("We're having trouble connecting to the WSO2 login service. Please try again in a few minutes.");
    }
  }
});

// ─── Health check ──────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── Internal: notifications ───────────────────────────────────────────────
//
// Lets other internal services (e.g. til-backend, for new "Today I Learned"
// entries) send a card to everyone who has added Novera; see src/chat/notify.ts.
// Authenticated entirely at the Choreo API Gateway (callers present a
// client_credentials access token from an Application subscribed to this
// API) -- no application-level check here, since the gateway is confirmed
// to actually enforce that subscription auth on this path (verified live: a
// request with no token is rejected by Choreo Connect before it ever
// reaches this handler).
app.post("/internal/notifications", express.json({ limit: "64kb" }), async (req: Request, res: Response) => {
  const notification = parseNotification(req.body);
  if (typeof notification === "string") {
    return res.status(400).json({ error: notification });
  }
  // Refused rather than accepted when Novera can't call Google Chat at all, so
  // the caller knows nothing was sent and can offer to send it again later.
  const problem = await chatAccessProblem();
  if (problem) {
    console.error(`[notify] source=${notification.source} refused: ${problem}`);
    return res.status(503).json({ error: "Novera can't reach Google Chat right now" });
  }
  // ACK immediately -- the broadcast makes one Chat API call per connected
  // user, and callers treat it as best-effort.
  res.status(202).json({ accepted: true });
  void broadcastNotification(notification).catch((err) => console.error("[notify] broadcast failed:", err));
});

// ─── Helpers ───────────────────────────────────────────────────────────────

// Google Workspace Add-on response envelope for sending a Chat message.
// Accepts either a plain string (treated as text) or a structured body
// (e.g., the card returned by authPromptCard).
function chatReply(content: ChatBody) {
  const message = typeof content === "string" ? { text: content } : content;
  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message,
        },
      },
    },
  };
}

// If a reply string contains an Asgardeo authorize URL (the bot's auth-required
// path), turn it into a "Connect with Asgardeo" card. Otherwise pass through
// as text. The detection is scoped to oauth2/authorize URLs so policy or
// letter URLs in unrelated replies aren't accidentally turned into auth cards.
function renderReply(text: string): ChatBody {
  const authUrlMatch = text.match(/https?:\/\/\S+\/oauth2\/authorize\?\S+/);
  if (!authUrlMatch) return text;
  const authUrl = authUrlMatch[0];
  // Greeting = everything before the URL, with the typical "Click here to
  // authenticate:" filler stripped so the card surface stays clean.
  const beforeUrl = text.substring(0, authUrlMatch.index ?? 0).trim();
  const greeting = beforeUrl
    .replace(/\s*Click here to authenticate:\s*$/i, "")
    .replace(/\s*:?\s*$/, "")
    .trim() || "Connect your WSO2 account to continue.";
  return authPromptCard(greeting, authUrl);
}


async function withAuthCheck(user: ChatUser, message: string): Promise<string> {
  const token = await getToken(user.googleUserId);
  if (!token) {
    const authUrl = await generateAuthUrl(user.googleUserId, {
      originalMessage: message,
      spaceName: user.spaceName,
      threadName: user.threadName,
      displayName: user.displayName,
      userEmail: user.email,
    });
    return (
      `Hi ${user.displayName}! You need to connect your WSO2 account first.

` +
      `Click here to authenticate:
${authUrl}

` +
      `Once connected, I'll automatically continue with your request.`
    );
  }
  return processMessage(user, message);
}

// Async-reply flow for slow paths (LLM-bound): the /webhook handler ACKs the
// HTTP request immediately, this function runs in the background.
//
// 1. Post a placeholder ("⏳ Working on it...") via the Chat API so the user
//    sees feedback within ~500 ms instead of waiting blind for the full agent
//    turn. The Chat API call returns the message's resource name.
// 2. Run the actual agent logic via `withAuthCheck` / `processMessage` —
//    can take 3-10s depending on tool calls.
// 3. Update the placeholder in place with the real reply. Same message bubble,
//    content morphs from "Working on it..." to the answer.
//
// Failure handling:
//   - If the placeholder send fails (`name === null`): fall back to posting
//     the reply as a fresh proactive message so the user still gets an answer.
//   - If `withAuthCheck` throws: update the placeholder with a generic error
//     message rather than leaving "Working on it..." stuck there forever.
//
// This pattern also eliminates the duplicate-reply bug from webhook retries —
// the webhook returns 200 in ~50 ms so Chat / Cloudflare / Choreo have no
// reason to retry.
async function asyncReply(user: ChatUser, message: string): Promise<void> {
  // Resolve the anchor thread BEFORE we post anything. fail-open behaviour in
  // resolveAnchorThread means a Chat-API hiccup gives us "no anchor" → reply
  // in main section, which matches the user-preferred default.
  const anchorThread = await resolveAnchorThread(user.spaceName, user.threadName);
  // Use the resolved value throughout this turn (also when generating the auth
  // URL in withAuthCheck, so the post-OAuth welcome respects the same gating).
  const u: ChatUser = { ...user, threadName: anchorThread };

  // Schedule the placeholder for config.placeholderDelayMs from now. Two cases:
  //   - Agent loop finishes BEFORE the timer fires → clearTimeout cancels it,
  //     placeholderPromise stays null, we post the real reply fresh (1 call).
  //   - Timer fires first → placeholderPromise is set (the POST is in flight);
  //     when the loop finishes we await it to learn the placeholder name and
  //     PATCH it with the real reply (2 calls — same as before).
  // The setTimeout callback never throws; sendPlaceholderMessage already
  // swallows errors and returns null on failure.
  let placeholderPromise: Promise<string | null> | null = null;
  const placeholderTimer = setTimeout(() => {
    placeholderPromise = sendPlaceholderMessage(u.spaceName, "⏳ Working on it...", anchorThread);
  }, config.placeholderDelayMs);

  try {
    const reply = await withAuthCheck(u, message);
    clearTimeout(placeholderTimer);
    // If the timer already fired, placeholderPromise is set and the POST may
    // still be in flight; await it so we know whether to PATCH or POST fresh.
    const placeholderName = placeholderPromise ? await placeholderPromise : null;
    // If the reply carries an Asgardeo authorize URL (auth required), turn it
    // into a card with a "Connect with Asgardeo" button instead of dumping
    // the raw URL into chat.
    const content = renderReply(reply);
    if (placeholderName) {
      const updated = await updateMessage(placeholderName, content);
      if (!updated) {
        // Chat API rejected the PATCH (e.g. transient 5xx, message too long).
        // Don't leave the user staring at "Working on it..." forever — post
        // the answer as a fresh message instead. The stale placeholder remains
        // in the thread but the user gets the actual reply.
        console.warn("[async-reply] update failed; falling back to fresh message");
        await sendProactiveMessage(u.spaceName, content, anchorThread);
      }
    } else {
      // Fast path: no placeholder was ever posted (or its POST failed). Send
      // the reply directly as a fresh message.
      await sendProactiveMessage(u.spaceName, content, anchorThread);
    }
  } catch (err) {
    console.error("[async-reply] Failed processing message for", u.googleUserId, "—", err);
    clearTimeout(placeholderTimer);
    const placeholderName = placeholderPromise ? await placeholderPromise : null;
    const errorText = "Sorry, something went wrong. Please try again.";
    if (placeholderName) {
      await updateMessage(placeholderName, errorText).catch(() => {});
    } else {
      await sendProactiveMessage(u.spaceName, errorText, anchorThread).catch(() => {});
    }
  }
}

// Resolve whether the user is a Sri Lanka employee. Returns:
//   true  — Sri Lanka employee (full feature set)
//   false — non-Sri-Lanka employee (leave-only)
//   undefined — unknown (not connected, token expired, or location lookup failed)
async function resolveIsSriLanka(googleUserId: string): Promise<boolean | undefined> {
  try {
    const token = await getToken(googleUserId);
    if (!token) return undefined;
    const idToken = await getValidIdToken(googleUserId);
    if (!idToken) return undefined;
    const loc = await getMyLocation(googleUserId, idToken);
    if (!loc.success || !loc.location) return undefined;
    return isSriLankaLocation(loc.location);
  } catch (err) {
    console.error("[help] Failed to resolve work location for", googleUserId, "—", err);
    return undefined;
  }
}

function helpText(isSriLanka?: boolean): string {
  const base = `Here's what I can help you with:

Leave management
  "Apply casual leave from April 5 to April 7"
  "Show my leave history"
  "Cancel my leave"

PO policy questions
  "What's our work-from-home policy?"
  "How many days of paternity leave do I get?"

Training & certification
  "What certifications does WSO2 offer?"
  "Who do I contact about training?"

Release schedule
  "What's releasing this week?"
  "What's shipping next week for the API Manager team?"

PO letter requests
  "I need a visa letter"
  "How do I request an employment confirmation letter?"

Report a bug / check status
  "Report a bug: the menu reply was wrong"
  "What's the status of my reported issues?"`;

  // Non-Sri-Lanka: leave-only. Show only the shared sections and an explicit note.
  if (isSriLanka === false) {
    return base + `

Just tell me what you need — no special commands required.`;
  }

  // Sri Lanka (or unknown — show the full feature set so connected SL users see
  // everything, and unconnected users see all options before they connect).
  return base + `

Cafeteria menu (LK office)
  "What's for lunch today?"

Vehicle registration (LK office)
  "Register my car ABC 1234"
  "List my vehicles"
  "Delete a vehicle"

Just tell me what you need — no special commands required.`;
}

// ─── Start server ──────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`Novera running on port ${config.port}`);
  // Log the effective LLM endpoint — ANTHROPIC_BASE_URL silently redirects every
  // API call (and the API key with it), so make a non-default value visible on boot.
  const anthropicBaseUrl = config.anthropic.baseUrl ?? DEFAULT_ANTHROPIC_BASE_URL;
  console.log(`[anthropic] model=${config.anthropic.model} endpoint=${anthropicBaseUrl}`);
  if (config.anthropic.baseUrl && new URL(config.anthropic.baseUrl).protocol !== "https:") {
    console.error(`[anthropic] WARNING: ANTHROPIC_BASE_URL is not https — the API key is sent in plaintext to ${anthropicBaseUrl}`);
  }
});

// Periodically clean up abandoned OAuth state rows (user started auth but never completed it).
// Runs every hour — states expire after 10 minutes so this is more than frequent enough.
setInterval(() => deleteStaleOAuthStates().catch(console.error), 60 * 60 * 1000);

// Purge known-thread rows older than 90 days. Runs once a day — slow-growing
// table, no urgency. Also fires once at startup so a long-running pod gets at
// least one pass before its first interval tick.
void purgeOldThreads();
setInterval(() => purgeOldThreads(), 24 * 60 * 60 * 1000);

// PO policy Drive sync — runs immediately on startup, then on the configured interval.
startPolicySync();

// Training & Certification playbook Drive sync (v1.1.0) — same startup +
// interval pattern as PO policy, gated on TRAINING_SYNC_ENABLED.
startTrainingSync();
