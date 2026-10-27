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

// Common words a question is full of but that say nothing about which passage matters.
const STOP_WORDS = new Set([
  "this", "that", "with", "from", "have", "does", "what", "when", "where", "which", "about",
  "there", "would", "could", "should", "while", "these", "those", "into", "over", "then", "than",
  "give", "some", "tell", "your", "ours", "content", "information",
]);

const MAX_WORDS = 8;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The words of a question worth looking for in a passage: longer than three letters, not filler. */
export function queryWords(query: string): string[] {
  const words = (query.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (word) => word.length > 3 && !STOP_WORDS.has(word),
  );
  return [...new Set(words)].slice(0, MAX_WORDS);
}

export interface TextPart {
  text: string;
  /** True for a stretch that matches a word of the question. */
  match: boolean;
}

/** Splits a passage into plain and matching stretches (whole words, any case); the pieces always join back to the text. */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = queryWords(query);
  if (!text || words.length === 0) return [{ text, match: false }];
  const pattern = new RegExp(`\\b(${words.map(escapeRegExp).join("|")})\\b`, "gi");
  // split() with one capture group alternates: plain, match, plain, match, ...
  return text
    .split(pattern)
    .map((piece, index) => ({ text: piece, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}

const SNIPPET_MAX_LENGTH = 240;

/** A passage shortened to a few lines, on a word boundary. */
export function snippetOf(content: string, maxLength = SNIPPET_MAX_LENGTH): string {
  const collapsed = (content ?? "").replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  const truncated = collapsed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}
