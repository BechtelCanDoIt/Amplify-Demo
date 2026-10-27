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

import type { ResultKind } from "./libraryResults";

/** Why a result opens in a new tab instead of in this page, in the words a seller needs. */
export function newTabNote(kind: ResultKind, location: string | null): string {
  switch (kind) {
    case "video":
      return `Opens in a new tab${location ? `, at ${location}` : ""}.`;
    case "pdf":
      return `${location ? `The match is on ${location}. ` : ""}Google Drive opens the whole PDF in a new tab.`;
    case "web":
      return "Opens the page in a new tab, and scrolls to the matching text where the browser supports it.";
    case "link":
      return "Opens the linked content in a new tab.";
    default:
      return "Opens in a new tab.";
  }
}
