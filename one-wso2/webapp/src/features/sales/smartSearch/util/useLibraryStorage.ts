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

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";
import {
  LIBRARY_STORAGE_EVENT,
  addRecent,
  clearRecent,
  hasSeenIntro,
  markIntroSeen,
  parseRecent,
  readRecentRaw,
} from "./libraryStorage";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(LIBRARY_STORAGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LIBRARY_STORAGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The signed-in person's recent searches, most recent first, and the way to add and clear them. */
export function useRecentSearches(): { items: string[]; add: (query: string) => void; clear: () => void } {
  const { state } = useAsgardeoSub();
  const userKey = state.status === "ready" ? state.sub : undefined;
  const raw = useSyncExternalStore(
    subscribe,
    () => (userKey ? readRecentRaw(userKey) : "[]"),
    () => "[]",
  );
  const items = useMemo(() => parseRecent(raw), [raw]);
  const add = useCallback(
    (query: string) => {
      if (userKey) addRecent(userKey, query);
    },
    [userKey],
  );
  const clear = useCallback(() => {
    if (userKey) clearRecent(userKey);
  }, [userKey]);
  return { items, add, clear };
}

/** Whether to show the welcome card, and the way to dismiss it for good. */
export function useIntroCard(): { show: boolean; dismiss: () => void } {
  const seen = useSyncExternalStore(
    subscribe,
    () => (hasSeenIntro() ? "seen" : "new"),
    () => "seen",
  );
  return { show: seen === "new", dismiss: markIntroSeen };
}
