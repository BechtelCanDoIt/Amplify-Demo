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

// Nested under /sales so the Sales rail stays around the page. The question lives in ?q= so a search can be refreshed, pinned and shared.

export const SMART_SEARCH_LIBRARY_PATH = "/sales/library";

/** The query-string parameter that carries the question. */
export const LIBRARY_QUERY_PARAM = "q";

/** The longest question the search box accepts. */
export const LIBRARY_MAX_QUERY_LENGTH = 300;

/** The Library's address, with the question in it when there is one. */
export function libraryPath(query?: string): string {
  const question = query?.trim();
  return question
    ? `${SMART_SEARCH_LIBRARY_PATH}?${LIBRARY_QUERY_PARAM}=${encodeURIComponent(question)}`
    : SMART_SEARCH_LIBRARY_PATH;
}
