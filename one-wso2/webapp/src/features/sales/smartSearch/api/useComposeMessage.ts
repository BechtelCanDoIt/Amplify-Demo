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

import { useMutation } from "@tanstack/react-query";
import { authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { smartSearchServiceUrls } from "@config/apiConfig";
import { RequestTimeoutError } from "../util/libraryFailure";
import type { ComposeIntent, ComposeResponse } from "./smartSearchTypes";

/**
 * How long to wait for a message before giving up. The backend gives up on the writing service after 120 seconds, so this
 * is a little longer: the reader is then told what the backend found, and only a backend that never answers is cut off here.
 */
export const COMPOSE_TIMEOUT_MS = 140_000;

/** Waits for the promise, but no longer than this: a request that never answers must not leave the page waiting forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface ComposeVariables {
  /** What was searched for, so the message is about what the seller was looking for. */
  query: string;
  /** The Pitstop content ids of the results to write from, best match first. */
  documentIds: string[];
  intent: ComposeIntent;
  /** What the seller needs it for, in their own words. Only for "custom", where it is required. */
  purpose?: string;
}

/**
 * Asks the backend to write a short message from the results of a search, all of them together. Only the question, the
 * results' ids and the kind of message are sent: the backend finds the excerpts itself, so it only ever writes from
 * what this person may see. Names for an email are added on this side and never leave the browser. Not retried: each
 * attempt is a paid model call.
 */
export function useComposeMessage() {
  const getAccessToken = useAccessToken();
  return useMutation<ComposeResponse, Error, ComposeVariables>({
    // Set here, not left to the app's defaults: a retry would pay for the same message twice.
    retry: false,
    mutationFn: async (variables) => {
      const token = await getAccessToken();
      const response = await withTimeout(
        authedPost<ComposeResponse>(smartSearchServiceUrls.compose(), token, variables),
        COMPOSE_TIMEOUT_MS,
      );
      const text = response?.text?.trim() ?? "";
      if (!text) throw new Error("The message came back empty.");
      return {
        text,
        documentIds: Array.isArray(response?.documentIds) ? response.documentIds : [],
        subject: typeof response?.subject === "string" ? response.subject : null,
      };
    },
  });
}
