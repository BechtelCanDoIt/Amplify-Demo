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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// refreshIdToken is the gateway to the session-expired verdict: a failed
// attempt raises the app-wide, non-dismissable dialog. Whether it is called at
// all is the behaviour under test.
const { refreshIdToken, rawIdToken, getSessionExpiredSnapshot } = vi.hoisted(() => ({
  refreshIdToken: vi.fn(),
  rawIdToken: vi.fn(),
  getSessionExpiredSnapshot: vi.fn(() => false),
}));
vi.mock("@api/authBridge", () => ({ refreshIdToken, rawIdToken, getSessionExpiredSnapshot }));

const getDecodedIdToken = vi.fn();
vi.mock("@asgardeo/react", () => ({
  useAsgardeo: () => ({ isSignedIn: true, getDecodedIdToken }),
}));

import {
  __resetResolvedSubForTests,
  foldIdentityError,
  forgetResolvedSubOnSignOut,
  useAsgardeoSub,
} from "./useAsgardeoSub";
import type { UseQueryResult } from "@tanstack/react-query";

function jwt(payload: Record<string, unknown>): string {
  const seg = (o: unknown) => {
    const utf8 = new TextEncoder().encode(JSON.stringify(o));
    return btoa(Array.from(utf8, (b) => String.fromCharCode(b)).join(""))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };
  return `${seg({ alg: "RS256" })}.${seg(payload)}.sig`;
}

const liveToken = () => jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
const deadToken = () => jwt({ exp: Math.floor(Date.now() / 1000) - 3600 });

beforeEach(() => {
  // The resolved sub is shared across instances by design, so it outlives a
  // single test unless each one starts from nothing.
  __resetResolvedSubForTests();
  vi.clearAllMocks();
  getSessionExpiredSnapshot.mockReturnValue(false);
  refreshIdToken.mockResolvedValue("refreshed");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("useAsgardeoSub — deciding whether a decode failure means the session died", () => {
  it("resolves sub when the decode simply works", async () => {
    getDecodedIdToken.mockResolvedValue({ sub: "uid-1" });

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", sub: "uid-1" }));
    expect(refreshIdToken).not.toHaveBeenCalled();
  });

  // THE regression. A decode that fails while the token is demonstrably live is
  // not an expired session, and must not reach the machinery that says it is —
  // this path can raise the app-wide dialog with no HTTP request involved.
  it("does NOT re-auth when the id_token is still live", async () => {
    rawIdToken.mockResolvedValue(liveToken());
    getDecodedIdToken.mockRejectedValueOnce(new Error("SDK busy")).mockResolvedValue({ sub: "uid-1" });

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", sub: "uid-1" }));
    expect(refreshIdToken).not.toHaveBeenCalled();
  });

  it("gives up without a re-auth when a live token repeatedly will not decode", async () => {
    rawIdToken.mockResolvedValue(liveToken());
    getDecodedIdToken.mockRejectedValue(new Error("still broken"));

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(refreshIdToken).not.toHaveBeenCalled();
  });

  it("DOES re-auth once the id_token has expired", async () => {
    rawIdToken.mockResolvedValue(deadToken());
    getDecodedIdToken.mockRejectedValueOnce(new Error("expired")).mockResolvedValue({ sub: "uid-1" });

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(result.current.state).toEqual({ status: "ready", sub: "uid-1" }));
    expect(refreshIdToken).toHaveBeenCalledTimes(1);
  });

  // A silent re-auth is a prompt=none iframe against a session the user has
  // just ended. The live branch below already checked `cancelled` after its
  // await; this path did not, so a sign-out or unmount while the raw token was
  // being read fell straight through to refreshIdToken().
  it("does not start a silent re-auth for a session that ended mid-check", async () => {
    let release!: (token: string) => void;
    rawIdToken.mockReturnValue(
      new Promise<string>((resolve) => {
        release = resolve;
      }),
    );
    getDecodedIdToken.mockRejectedValue(new Error("expired"));

    const { unmount } = renderHook(() => useAsgardeoSub());
    await waitFor(() => expect(rawIdToken).toHaveBeenCalled());

    unmount();
    release(deadToken());
    // Two turns of the microtask queue: one for the raw-token read to settle,
    // one for whatever the effect would do next.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(refreshIdToken).not.toHaveBeenCalled();
  });

  // The escape hatch, matching @api/http: anything unreadable behaves exactly
  // as it did before this check existed.
  it("falls back to re-auth when the raw token cannot be read", async () => {
    rawIdToken.mockResolvedValue("opaque");
    getDecodedIdToken.mockRejectedValueOnce(new Error("nope")).mockResolvedValue({ sub: "uid-1" });

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(refreshIdToken).toHaveBeenCalledTimes(1);
  });

  it("falls back to re-auth when reading the raw token throws", async () => {
    rawIdToken.mockRejectedValue(new Error("accessors not registered"));
    getDecodedIdToken.mockRejectedValueOnce(new Error("nope")).mockResolvedValue({ sub: "uid-1" });

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(refreshIdToken).toHaveBeenCalledTimes(1);
  });

  // A resolved identity must not be withdrawn while it is re-checked. This
  // effect re-runs whenever `isSignedIn`, `getDecodedIdToken` or a retry
  // changes, and it used to reset to `loading` every time — which nothing
  // downstream can absorb: `foldIdentityError` turns "identity loading + query
  // still pending" into a synthetic `isLoading`, and a DISABLED query is
  // pending for good (an unconfigured backend, a role-gated queue). So every
  // re-run flipped those hooks back to loading, `useFinanceGate.isResolving`
  // with them, and every screen keyed off it blanked and came back. That was
  // the Finance section's flickering.
  it("keeps a resolved sub on screen while it re-checks", async () => {
    getDecodedIdToken.mockResolvedValue({ sub: "uid-1" });
    const seen: string[] = [];

    const { result } = renderHook(() => {
      const hook = useAsgardeoSub();
      seen.push(hook.state.status);
      return hook;
    });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    const before = seen.length;
    result.current.retry();
    await waitFor(() => expect(getDecodedIdToken).toHaveBeenCalledTimes(2));

    expect(seen.slice(before)).not.toContain("loading");
    expect(result.current.state).toEqual({ status: "ready", sub: "uid-1" });
  });

  // Mounting a screen must not re-decode the token behind a skeleton when the
  // app already knows who is signed in. `userSub` is part of every finance
  // query KEY, so an instance that starts at "loading" keys onto an EMPTY
  // cache entry and reports no data for it — which is why switching Finance →
  // Overview's dropdown to OPD Claims flashed a skeleton over data already in
  // hand, on every single switch.
  it("starts a later instance from the identity already resolved", async () => {
    getDecodedIdToken.mockResolvedValue({ sub: "uid-1" });

    const first = renderHook(() => useAsgardeoSub());
    await waitFor(() => expect(first.result.current.state.status).toBe("ready"));

    // A screen mounting afterwards — a fresh hook instance, as a dropdown
    // switch produces — is ready on its very first render, not "loading".
    const seen: string[] = [];
    const second = renderHook(() => {
      const hook = useAsgardeoSub();
      seen.push(hook.state.status);
      return hook;
    });

    expect(seen[0]).toBe("ready");
    expect(seen).not.toContain("loading");
    expect(second.result.current.state).toEqual({ status: "ready", sub: "uid-1" });
  });

  // THE regression this exists to close. `AuthGuard` unmounts every consumer of
  // this hook in the SAME render that `isSignedIn` goes false, so the
  // per-instance effect's own `if (!isSignedIn)` clear can miss entirely —
  // no instance survives to observe the change it would be reacting to. This
  // is why `forgetResolvedSubOnSignOut` exists and why `useSecureSignOut`
  // calls it directly: it must work with ZERO `useAsgardeoSub()` instances
  // mounted in between, which is the exact shape of a real sign-out.
  it("stops a later mount seeding from a sub nobody was still mounted to clear", async () => {
    getDecodedIdToken.mockResolvedValue({ sub: "uid-1" });
    const first = renderHook(() => useAsgardeoSub());
    await waitFor(() => expect(first.result.current.state.status).toBe("ready"));
    first.unmount();

    // The real sign-out boundary, called with nothing of this hook's mounted
    // — exactly what useSecureSignOut does.
    forgetResolvedSubOnSignOut();

    // A different account signs in; this is its first-ever instance.
    getDecodedIdToken.mockResolvedValue({ sub: "uid-2" });
    const second = renderHook(() => useAsgardeoSub());

    // Not "ready" with uid-1, not even "ready" with uid-2 yet — "loading",
    // same as any instance that has never resolved anything.
    expect(second.result.current.state).toEqual({ status: "loading" });

    await waitFor(() => expect(second.result.current.state.status).toBe("ready"));
    expect(second.result.current.state).toEqual({ status: "ready", sub: "uid-2" });
  });

  // Unchanged, and worth keeping pinned: once the dialog owns the message,
  // this hook stays on its skeleton rather than lighting up eleven separate
  // error notices blaming eleven features for one dead session.
  it("stays in loading when the session-expired dialog is already up", async () => {
    getSessionExpiredSnapshot.mockReturnValue(true);
    rawIdToken.mockResolvedValue(deadToken());
    getDecodedIdToken.mockRejectedValue(new Error("expired"));
    refreshIdToken.mockRejectedValue(new Error("silent re-auth failed"));

    const { result } = renderHook(() => useAsgardeoSub());

    await waitFor(() => expect(refreshIdToken).toHaveBeenCalled());
    expect(result.current.state.status).toBe("loading");
  });
});

// A disabled query with no data reports `isLoading: false` in React Query
// v5 (`isLoading` is `isPending && isFetching`, and a disabled query is
// never `isFetching`) — so every sub-keyed hook (CC/OPD/Expense user-info,
// ...) that stays disabled while identity resolves would otherwise read as
// "settled" during that gap, before the query it's actually waiting on ever
// gets to run. `useFinanceGate`'s `isResolving` (and every page that keys
// off these hooks' `isLoading`) reads that false "settled" as "no access",
// which is what made the Finance section flash its no-access/skeleton state
// on load before the real answer arrived a moment later.
function pendingDisabledQuery(): UseQueryResult<unknown, Error> {
  return {
    status: "pending",
    fetchStatus: "idle",
    isPending: true,
    isLoading: false,
    isFetching: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    refetch: vi.fn(),
  } as unknown as UseQueryResult<unknown, Error>;
}

function settledQuery(data: unknown): UseQueryResult<unknown, Error> {
  return {
    status: "success",
    fetchStatus: "idle",
    isPending: false,
    isLoading: false,
    isFetching: false,
    isSuccess: true,
    isError: false,
    data,
    error: null,
    refetch: vi.fn(),
  } as unknown as UseQueryResult<unknown, Error>;
}

describe("foldIdentityError — closing the gap a disabled query leaves open", () => {
  it("reports loading while identity resolves and the query has no data yet", () => {
    const folded = foldIdentityError(pendingDisabledQuery(), { status: "loading" }, vi.fn());
    expect(folded.isLoading).toBe(true);
    expect(folded.isPending).toBe(true);
    expect(folded.isError).toBe(false);
  });

  it("does not hide data the query already has just because identity is re-checking", () => {
    const folded = foldIdentityError(settledQuery({ ok: true }), { status: "loading" }, vi.fn());
    expect(folded.isLoading).toBe(false);
    expect(folded.data).toEqual({ ok: true });
  });

  it("does not touch a query that has already resolved once identity is ready", () => {
    const query = settledQuery({ ok: true });
    const folded = foldIdentityError(query, { status: "ready", sub: "user-1" }, vi.fn());
    expect(folded).toBe(query);
  });

  it("still turns a genuine identity failure into a real, retryable error", () => {
    const retryIdentity = vi.fn();
    const folded = foldIdentityError(
      pendingDisabledQuery(),
      { status: "error", message: "Couldn't verify your session." },
      retryIdentity,
    );
    expect(folded.isError).toBe(true);
    expect(folded.isLoading).toBe(false);
    expect(folded.error?.message).toBe("Couldn't verify your session.");
    void folded.refetch();
    expect(retryIdentity).toHaveBeenCalled();
  });
});
