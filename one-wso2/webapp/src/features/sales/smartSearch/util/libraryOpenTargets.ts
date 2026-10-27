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

import type { SmartSearchSource } from "../api/smartSearchTypes";
import { queryWords } from "./libraryHighlight";

const GOOGLE_HOSTS: ReadonlySet<string> = new Set(["drive.google.com", "docs.google.com"]);

/** Exact origin check, never a substring match: a look-alike host must not pass. */
export function isTrustedGoogleLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && GOOGLE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Adds a scroll-to-text fragment at the line holding most of the question's words; unsupported browsers just open the page.
 */
export function withTextFragment(url: string, matchedText: string, query: string): string {
  const lines = matchedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const words = queryWords(query);
  const scoreLine = (line: string): number => {
    const lower = line.toLowerCase();
    return words.filter((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`).test(lower)).length;
  };
  const relevantLine = lines.reduce((best, line) => (scoreLine(line) > scoreLine(best) ? line : best), lines[0] ?? "");
  const normalized = relevantLine.replace(/\s+/g, " ");
  const truncated = normalized.slice(0, 120);
  const wordBreak = truncated.lastIndexOf(" ");
  const snippet = truncated.length < normalized.length && wordBreak > 0 ? truncated.slice(0, wordBreak) : truncated;
  if (!snippet) return url;
  try {
    // A bare hyphen breaks the match, and encodeURIComponent doesn't escape it.
    const encoded = encodeURIComponent(snippet).replace(/-/g, "%2D");
    const parsed = new URL(url);
    const existingHash = parsed.hash.replace(/^#/, "").replace(/:~:text=.*/, "");
    parsed.hash = existingHash ? `${existingHash}:~:text=${encoded}` : `:~:text=${encoded}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Where a click goes (always a new tab), or null when nowhere is safe. Deep link first, then a reference's own link,
 * then a web page at the matching line, else an https Google Drive or Docs link.
 */
export function openTargetFor(source: SmartSearchSource, query: string): string | null {
  if (source.nativeLink && isTrustedGoogleLink(source.nativeLink)) return source.nativeLink;
  if (source.fileExtension === "reference") return isHttpsUrl(source.driveLink) ? source.driveLink : null;
  if (source.fileExtension === "webpage") {
    return isHttpsUrl(source.driveLink) ? withTextFragment(source.driveLink, source.content ?? "", query) : null;
  }
  return isTrustedGoogleLink(source.driveLink) ? source.driveLink : null;
}

const FILE_ID = "([A-Za-z0-9_-]+)";
const DOCS_PATH = new RegExp(`^/(document|presentation|spreadsheets)/d/${FILE_ID}`);
const SLIDE_ID = /^id\.[A-Za-z0-9_]+$/;

/**
 * An address that can be framed, or null. Only docs.google.com is allowed by the CSP, and the address is rebuilt
 * from the file id, never taken from the link as given.
 */
export function embedUrlFor(source: SmartSearchSource): string | null {
  let link: URL;
  try {
    link = new URL(source.driveLink);
  } catch {
    return null;
  }
  if (link.protocol !== "https:" || link.hostname !== "docs.google.com") return null;
  const match = link.pathname.match(DOCS_PATH);
  if (!match) return null;
  const [, kind, id] = match;

  if (kind === "document") return `https://docs.google.com/document/d/${id}/preview`;
  if (kind === "spreadsheets") return `https://docs.google.com/spreadsheets/d/${id}/htmlview`;

  const base = `https://docs.google.com/presentation/d/${id}/embed`;
  let slide: string | null = null;
  try {
    const fromLink = new URL(source.nativeLink).searchParams.get("slide");
    if (fromLink && SLIDE_ID.test(fromLink)) slide = fromLink;
  } catch {
    // No deep link; fall back to the slide number below.
  }
  if (!slide && source.page !== null && Number.isInteger(source.page) && source.page > 0) slide = String(source.page);
  return slide ? `${base}?slide=${slide}` : base;
}
