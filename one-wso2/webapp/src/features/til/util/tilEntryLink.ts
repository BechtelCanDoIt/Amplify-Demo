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
import type { KeyboardEvent } from "react";

/** Makes an entry's container open it on click or Enter, like a link. */
export function entryLinkProps(onOpen: () => void) {
  return {
    onClick: onOpen,
    role: "link",
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      // target === currentTarget so Enter on the edit/delete IconButtons
      // inside (which bubbles as a keydown same as any other) doesn't ALSO
      // open the entry -- only a keypress on the entry itself counts.
      if (e.key === "Enter" && e.target === e.currentTarget) onOpen();
    },
  } as const;
}
