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

// Recent searches and the welcome-card flag, kept only in this browser. Storage can be blocked, so every access is guarded.

const RECENT_BASE_KEY = "one-wso2.library.recent.v1";
const INTRO_KEY = "one-wso2.library.intro.v1";

export const MAX_RECENT_SEARCHES = 6;

/** Fired in this tab after a change, since the browser's own `storage` event only reaches other tabs. */
export const LIBRARY_STORAGE_EVENT = "one-wso2:library-storage-changed";

// Per person: two people on one browser must not see each other's searches.
const recentKey = (userKey: string): string => `${RECENT_BASE_KEY}.${userKey}`;

function notify(): void {
  window.dispatchEvent(new CustomEvent(LIBRARY_STORAGE_EVENT));
}

/** The stored list as text. Text, not an array, so that reading it twice gives an equal value. */
export function readRecentRaw(userKey: string): string {
  try {
    return localStorage.getItem(recentKey(userKey)) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseRecent(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

/** Puts a search at the top of the list. Running it again moves it up rather than listing it twice. */
export function addRecent(userKey: string, query: string): void {
  const term = query.trim();
  if (!term) return;
  const others = parseRecent(readRecentRaw(userKey)).filter((entry) => entry.toLowerCase() !== term.toLowerCase());
  try {
    localStorage.setItem(recentKey(userKey), JSON.stringify([term, ...others].slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    return;
  }
  notify();
}

export function clearRecent(userKey: string): void {
  try {
    localStorage.removeItem(recentKey(userKey));
  } catch {
    return;
  }
  notify();
}

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "seen";
  } catch {
    // Blocked storage: show nothing rather than the same card on every visit.
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_KEY, "seen");
  } catch {
    return;
  }
  notify();
}
