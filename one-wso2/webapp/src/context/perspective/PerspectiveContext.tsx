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

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router";
import {
  findPerspectiveByPath,
  findPerspectiveByKey,
  type PerspectiveDef,
} from "@constants/perspectives";

interface PerspectiveContextValue {
  active: PerspectiveDef;
}

const PerspectiveContext = createContext<PerspectiveContextValue | undefined>(
  undefined,
);

// Same-tab-only, and deliberately not React state: this is read once per
// render inside the useMemo below, and written from an effect that has
// nothing else watching it — the "sync to an external system" case the
// hooks lint rules DO allow, as opposed to mirroring location into a state
// variable only to re-render off of it (the pattern the note below rejects).
const LAST_PERSPECTIVE_STORAGE_KEY = "one-wso2:last-perspective";

function readLastPerspective(): string | undefined {
  try {
    return sessionStorage.getItem(LAST_PERSPECTIVE_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeLastPerspective(key: string): void {
  try {
    sessionStorage.setItem(LAST_PERSPECTIVE_STORAGE_KEY, key);
  } catch {
    // Private browsing / storage blocked: losing the "survives a refresh"
    // convenience is fine — nothing else depends on this value existing.
  }
}

// Derive the "active" perspective from the current route so the rail /
// top-bar stay in sync without a duplicate state store.
//
// Not every route belongs to a perspective. `/settings` is top-level and owned
// by none of them (it is the only such route — every other path in App.tsx sits
// under one), and the fallback used to be People Ops. So opening Settings
// relabelled the rail "People Ops", swapped in its Reports and Master Data
// sections, offered an Overview row pointing at /people-ops, and switched off
// the finance gate, which is keyed on `active.key === "me"`. SideRail also
// navigates to `active.path` when the pathname differs, so it could bounce the
// user out of Settings altogether.
//
// Me is the right fallback: it is the cross-perspective home every user has,
// and the one landingConfig already defaults to. People Ops is a functional
// area not everyone can even open.
//
// Where the rail stays put: whoever sends the user to a route that owns no
// perspective passes the one they were in as navigation state. SideRail's
// Settings item does exactly that. It lives in the navigation rather than in a
// ref or an effect because both are closed here — a ref cannot be read during
// render, and mirroring the location into state is the cascading-render pattern
// the hooks lint rules forbid.
//
// A cold deep link to /settings carries no state, so it still lands on Me —
// UNLESS sessionStorage remembers a better answer, see below.
//
// A `?from=` query param is the same idea, for the one case navigation state
// can't reach: a file viewer opened with `window.open` (e.g. a Due Diligence
// attachment) is a brand-new tab, not a client-side navigation — there is no
// history entry to attach state to, but the URL that opens it is built by
// the caller, so it can carry the origin perspective itself.
//
// sessionStorage is the last fallback before Me, for the one case NEITHER
// state NOR a query param survives: a plain browser refresh on a page that
// owns no perspective (e.g. /due-diligence/partners, reached earlier via a
// rail click) carries no history state and no query param — the URL is just
// its own path. Whenever `active` resolves to something other than Me by any
// other means, that key is remembered for the rest of the tab, so a refresh
// here recovers Finance/Legal instead of silently falling back to Me.
export function PerspectiveProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const fromPerspective = (location.state as { fromPerspective?: unknown } | null)
    ?.fromPerspective;
  const fromQuery = new URLSearchParams(location.search).get("from");
  const active = useMemo<PerspectiveDef>(() => {
    const lastPerspective = readLastPerspective();
    return (
      findPerspectiveByPath(location.pathname) ??
      (typeof fromPerspective === "string"
        ? findPerspectiveByKey(fromPerspective)
        : undefined) ??
      (fromQuery ? findPerspectiveByKey(fromQuery) : undefined) ??
      (lastPerspective ? findPerspectiveByKey(lastPerspective) : undefined) ??
      findPerspectiveByKey("me")!
    );
  }, [location.pathname, fromPerspective, fromQuery]);

  useEffect(() => {
    if (active.key !== "me") writeLastPerspective(active.key);
  }, [active.key]);

  const value = useMemo<PerspectiveContextValue>(() => ({ active }), [active]);
  return (
    <PerspectiveContext.Provider value={value}>
      {children}
    </PerspectiveContext.Provider>
  );
}

export function useActivePerspective(): PerspectiveDef {
  const ctx = useContext(PerspectiveContext);
  if (!ctx) {
    throw new Error(
      "useActivePerspective must be used inside <PerspectiveProvider>",
    );
  }
  return ctx.active;
}
