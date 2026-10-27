// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import type { ComposeIntent } from "../api/smartSearchTypes";
import { escapeHtml } from "./libraryCopyText";
import { isHttpsUrl } from "./libraryOpenTargets";

/** The text cut to this many characters, as people count them: an emoji or an accented letter is one, never half of one. */
const cut = (text: string, max: number): string => {
  const characters = Array.from(text);
  return characters.length <= max ? text : characters.slice(0, max).join("");
};

const lengthOf = (text: string): number => Array.from(text).length;

/** One thing a seller can need a result for. The wording is what the small cards show. */
export interface ComposeOption {
  readonly id: ComposeIntent;
  readonly title: string;
  readonly hint: string;
}

/** In the order the cards are shown. */
export const COMPOSE_OPTIONS: readonly ComposeOption[] = [
  { id: "email", title: "Email a customer", hint: "Short email with the links" },
  { id: "chat", title: "Send a chat message", hint: "A quick, friendly message" },
  { id: "plain", title: "Plain summary", hint: "A few lines for notes" },
  { id: "explain", title: "Understand these", hint: "When and why to use them" },
  { id: "custom", title: "Something else", hint: "Tell us what you need it for" },
];

/** Only an email is addressed to someone, so only it asks for names. */
export const asksForNames = (intent: ComposeIntent): boolean => intent === "email";

/** Only "something else" has the seller say, in their own words, what the message is for. */
export const asksForPurpose = (intent: ComposeIntent): boolean => intent === "custom";

/** The longest "what do you need it for" the box accepts: the same limit the backend has. */
export const MAX_PURPOSE_LENGTH = 500;

/** What the seller typed, without stray spaces and cut to the longest the backend takes; empty when blank. */
export function cleanPurpose(purpose: string): string {
  return cut(purpose.trim(), MAX_PURPOSE_LENGTH).trim();
}

/** The longest name the boxes accept. */
export const MAX_NAME_LENGTH = 60;

const NAME_PLACEHOLDER = "[Name]";
const SENDER_PLACEHOLDER = "[Your name]";
const SUBJECT_MAX_LENGTH = 80;

/** A name as typed, on one line and without stray spaces; empty when there is nothing to use. */
export function cleanName(name: string): string {
  return cut(name.replace(/\s+/g, " ").trim(), MAX_NAME_LENGTH);
}

/** The longest subject line used: the same limit the backend has. */
const SUBJECT_MAX_LENGTH_WRITTEN = 120;

/** A subject the model wrote, on one line; empty when there is none worth using. */
export function cleanSubject(subject: string | null | undefined): string {
  const oneLine = (subject ?? "").replace(/\s+/g, " ").trim();
  return lengthOf(oneLine) > SUBJECT_MAX_LENGTH_WRITTEN ? "" : oneLine;
}

/** The question as a subject line: no closing punctuation, a capital letter, and short. Used when none was written. */
export function subjectOf(query: string): string {
  const cleaned = query.replace(/\s+/g, " ").trim().replace(/[?.!\s]+$/, "");
  const subject = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return lengthOf(subject) <= SUBJECT_MAX_LENGTH ? subject : `${cut(subject, SUBJECT_MAX_LENGTH - 1).trimEnd()}…`;
}

/** The most results a written message is made from: the same limit the backend has. */
export const MAX_COMPOSE_SOURCES = 10;

/** One source a message was written from, and where to send the reader. */
export interface MessageSource {
  readonly title: string;
  /** Where in it the link goes, such as "Slide 7"; null when it has no position. */
  readonly location: string | null;
  /** Where the link goes, already checked as safe; null when there is nowhere to send them. */
  readonly url: string | null;
}

/** Everything a written message is put together from. */
export interface MessageParts {
  readonly intent: ComposeIntent;
  /** What the model wrote. */
  readonly body: string;
  /** The subject the model wrote for an email; without one, the subject is made from the question. */
  readonly subject?: string | null;
  readonly query: string;
  /** The sources it was written from, best match first. */
  readonly sources: readonly MessageSource[];
  readonly customerName: string;
  readonly senderName: string;
}

/** The email's subject: the one the model wrote, or else the question made into one. */
const emailSubject = (parts: MessageParts): string => cleanSubject(parts.subject) || subjectOf(parts.query);

const sourceName = ({ title, location }: MessageSource): string => (location ? `${title} (${location})` : title);

/** The sources a reader can be sent to; one with nowhere safe to open is left out, and only a secure address is used. */
const linked = (sources: readonly MessageSource[]): (MessageSource & { readonly url: string })[] =>
  sources.filter((source): source is MessageSource & { readonly url: string } => source.url !== null && isHttpsUrl(source.url));

const findHeading = (count: number): string => (count === 1 ? "Where to find it:" : "Where to find them:");

/**
 * The finished message: what the model wrote, with the greeting, the links and the sign-off put around it here, so a
 * name or a web address never depends on what the model chose to say. Names left empty stay as places to fill in.
 */
export function buildMessageText(parts: MessageParts): string {
  const { intent, body } = parts;
  const links = linked(parts.sources);
  if (intent === "email") {
    const lines = [`Subject: ${emailSubject(parts)}`, "", `Hi ${cleanName(parts.customerName) || NAME_PLACEHOLDER},`, "", body];
    if (links.length > 0) {
      lines.push("", findHeading(links.length));
      links.forEach((source, index) => lines.push(`${index + 1}. ${sourceName(source)}`, source.url));
    }
    lines.push("", "Best regards,", cleanName(parts.senderName) || SENDER_PLACEHOLDER);
    return lines.join("\n");
  }
  if (intent === "chat") {
    return [body, ...links.map((source) => `• ${sourceName(source)} ${source.url}`)].join("\n");
  }
  // What the seller asked for in their own words has no frame of its own, so it ends with where it came from.
  if (intent === "plain" || intent === "custom") {
    if (links.length === 0) return body;
    return [body, "", "Sources:", ...links.map((source, index) => `${index + 1}. ${sourceName(source)} - ${source.url}`)].join("\n");
  }
  return body;
}

/** The email as HTML, so that pasted into Gmail or Outlook each source is a clickable link. Null for every other kind. */
export function buildMessageHtml(parts: MessageParts): string | null {
  if (parts.intent !== "email") return null;
  const links = linked(parts.sources);
  const paragraph = (text: string) => `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  const pieces = [
    paragraph(`Subject: ${emailSubject(parts)}`),
    paragraph(`Hi ${cleanName(parts.customerName) || NAME_PLACEHOLDER},`),
    paragraph(parts.body),
  ];
  if (links.length > 0) {
    const items = links.map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(sourceName(source))}</a></li>`);
    pieces.push(paragraph(findHeading(links.length)), `<ol>${items.join("")}</ol>`);
  }
  pieces.push(`<p>Best regards,<br>${escapeHtml(cleanName(parts.senderName) || SENDER_PLACEHOLDER)}</p>`);
  return pieces.join("");
}
