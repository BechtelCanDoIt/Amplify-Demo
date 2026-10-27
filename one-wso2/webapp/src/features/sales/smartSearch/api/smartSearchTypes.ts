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

// What the Pitstop backend's GET /smart-search returns. Only the fields the Library reads are
// declared; the backend sends more, and the response is passed through untouched.

/** One matching passage of one document. */
export interface SmartSearchSource {
  /** The passage's text. Empty for a "reference" result, whose text is a stand-in document's own. */
  content: string;
  title: string;
  /** Page, slide, sheet or section number; null when the document has none. */
  page: number | null;
  /** Closeness to the question, 0 to 1. */
  similarityScore: number;
  /** The Pitstop content id, as text. */
  documentId: string;
  /** What `page` counts: "Page", "Slide", "Sheet", "Section" or "Moment". */
  unitLabel: string;
  /** "pdf", "pptx", "docx", "xlsx", "webpage", "reference", ... */
  fileExtension: string;
  /** "drive" or "web". */
  source: string;
  /** The link the passage was indexed from. */
  driveLink: string;
  /** A link straight to the matching slide, heading or video moment; empty when there is none. */
  nativeLink: string;
}

/** The Pitstop content item behind a result. */
export interface SmartSearchContent {
  contentId: number;
  /** The item's title. */
  description: string;
  note?: string;
  tags?: string[];
  /** When it was added to Pitstop, as "YYYY-MM-DD HH:MM:SS.ffffff" in UTC. */
  createdOn: string;
  /** When an admin last verified it, in the same format. Missing on older backends, and null when never set. */
  lastVerifiedOn?: string | null;
  contentType: string;
  contentSubtype: string | null;
  thumbnail?: string;
}

export interface SmartSearchResponse {
  /** The written answer; null on the first call, and whenever none could be written. */
  answer: string | null;
  sources: SmartSearchSource[];
  contents: SmartSearchContent[];
}

/** What a written message is for: an email or chat message to a customer, a plain summary, an explanation, or what the seller types themselves. */
export type ComposeIntent = "email" | "chat" | "plain" | "explain" | "custom";

/** What the backend returns for POST /smart-search/compose. */
export interface ComposeResponse {
  /** The message, as plain text. */
  text: string;
  /** The Pitstop content ids of the results it was written from, best match first. */
  documentIds: string[];
  /** An email's subject line, when one was written; the text then does not repeat it. */
  subject?: string | null;
}
