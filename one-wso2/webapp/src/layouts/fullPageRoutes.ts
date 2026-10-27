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

import { matchPath } from "react-router";
import { isTilArticleSearch, TIL_FEED_PATH } from "@features/til/util/tilArticleView";

/**
 * Locations AppLayout renders without its shell (top bar, rail, footer,
 * launcher, Ask Novera, tour): pages that bring their own frame. They still
 * sit behind AuthGuard, and AppLayout still wraps them in the idle timeout
 * and the session-expired prompt.
 *
 * Today that is only a Today I Learned entry read as an article
 * (`/knowledge/today-i-learned/<id>?view=article`).
 */
export function isFullPageLocation(location: { pathname: string; search: string }): boolean {
  return (
    matchPath(`${TIL_FEED_PATH}/:id`, location.pathname) !== null &&
    isTilArticleSearch(location.search)
  );
}
