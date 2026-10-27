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

// One URL per entry, read two ways: inside One WSO2 (the default) or as a
// full-page article with ?view=article. The backend builds the same article
// link for the Novera broadcast, so the parameter name and value are part of
// that contract too.
export const TIL_VIEW_PARAM = "view";
export const TIL_ARTICLE_VIEW = "article";

export function isTilArticleSearch(search: string | URLSearchParams): boolean {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return params.get(TIL_VIEW_PARAM) === TIL_ARTICLE_VIEW;
}

/** The feed: Today I Learned, an app in the Knowledge perspective. The
 * backend builds the article link under the same path. */
export const TIL_FEED_PATH = "/knowledge/today-i-learned";

/** The entry inside One WSO2. */
export function tilEntryPath(id: string): string {
  return `${TIL_FEED_PATH}/${id}`;
}

/** The same entry as a full-page article. */
export function tilArticlePath(id: string): string {
  return `${tilEntryPath(id)}?${TIL_VIEW_PARAM}=${TIL_ARTICLE_VIEW}`;
}
