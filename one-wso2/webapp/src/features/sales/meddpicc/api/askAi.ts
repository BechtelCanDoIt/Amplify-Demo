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

// Ask AI's two requests. The Library is searched from here, as the signed-in user, so its
// answer only holds what they may see; the backend then answers from the opportunity and
// the passages sent. Kept apart from the MEDDPICC client: a question is not deal data.

import { authedGet, authedPost } from "@api/http";
import { echoServiceUrls, isSmartSearchBackendConfigured, smartSearchServiceUrls } from "@config/apiConfig";
import type { SmartSearchResponse } from "@features/sales/smartSearch/api/smartSearchTypes";
import type { AskAnswer, AskRequest, LibraryPassage } from "../types";

/** How many Library passages go with a question. */
export const LIBRARY_PASSAGES = 6;
/** How long the Library may take before the question goes without it. */
export const LIBRARY_WAIT_MS = 30_000;
/** How many questions the Library search carries: the current one and five before it. */
export const LIBRARY_QUESTIONS = 6;
const LIBRARY_QUERY_MAX = 1000;

/**
 * What the Library is searched with: the current question first, then the earlier ones,
 * newest first, so a follow-up ("does it run on-prem?") still says what "it" is. Trimmed
 * to what the search reads well.
 */
export function libraryQuery(question: string, earlierQuestions: string[]): string {
  const parts = [question, ...[...earlierQuestions].reverse()]
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, LIBRARY_QUESTIONS);
  const joined = parts.join(" | ");
  return joined.length > LIBRARY_QUERY_MAX ? joined.slice(0, LIBRARY_QUERY_MAX) : joined;
}

/**
 * The Library's passages for a question, search only (no written answer), as the user.
 * Null when the Library is not set up, fails, or takes longer than LIBRARY_WAIT_MS: the
 * question then goes without it.
 */
export async function searchLibrary(query: string, accessToken: string): Promise<LibraryPassage[] | null> {
  if (!isSmartSearchBackendConfigured()) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), LIBRARY_WAIT_MS);
  });
  try {
    const found = await Promise.race([
      authedGet<SmartSearchResponse>(smartSearchServiceUrls.search(query, false), accessToken),
      timeout,
    ]);
    if (!found) return null;
    return (found.sources ?? []).slice(0, LIBRARY_PASSAGES).map((s) => ({
      title: s.title,
      content: s.content,
      link: s.nativeLink || s.driveLink || null,
      page: s.page,
      unitLabel: s.unitLabel,
      documentId: s.documentId,
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The answer to one question about the opportunity. */
export async function askDeal(opportunityId: string, request: AskRequest, accessToken: string): Promise<AskAnswer> {
  const answer = await authedPost<AskAnswer>(echoServiceUrls.ask(opportunityId), accessToken, request);
  if (!answer) throw new Error("Ask AI sent no answer");
  return answer;
}
