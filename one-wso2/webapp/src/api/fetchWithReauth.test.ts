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

// refreshAccessToken is the gateway to the whole session-expiry verdict: a
// failed attempt is what raises the app-wide, non-dismissable dialog. So
// "was it called" is exactly the thing worth asserting.
// vi.hoisted because vi.mock is lifted above plain consts at transform time.
const { refreshAccessToken } = vi.hoisted(() => ({ refreshAccessToken: vi.fn() }));
vi.mock("@api/authBridge", () => ({ refreshAccessToken }));

import { fetchWithReauth } from "./http";
import { resetUnauthorizedOrigins } from "./tokenExpiry";

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

const res = (status: number) => new Response(null, { status });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetUnauthorizedOrigins();
  refreshAccessToken.mockReset();
  refreshAccessToken.mockResolvedValue("fresh-token");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchWithReauth — attributing a 401", () => {
  // THE regression this file exists for. One backend answering 401 for its own
  // reasons used to provoke a silent re-auth whose failure locked every screen
  // in the app behind a dialog that cannot be dismissed.
  it("does NOT re-auth when our token is still valid", async () => {
    fetchMock.mockResolvedValue(res(401));

    const out = await fetchWithReauth("https://faulty.example.com/api/v1/x", {}, liveToken());

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(out.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry either
  });

  it("stays quiet however many times that one backend fails", async () => {
    fetchMock.mockResolvedValue(res(401));
    const token = liveToken();

    for (let i = 0; i < 10; i++) {
      await fetchWithReauth(`https://faulty.example.com/api/v1/x/${i}`, {}, token);
    }

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("DOES re-auth once our token has expired", async () => {
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200));

    const out = await fetchWithReauth("https://any.example.com/api/v1/x", {}, deadToken());

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(200);
  });

  // A token revoked before it expires still reads as live, and every backend
  // refuses it. Two distinct origins is what tells that apart from one broken
  // service.
  it("re-auths on a live token once a second origin also refuses", async () => {
    fetchMock.mockResolvedValue(res(401));
    const token = liveToken();

    await fetchWithReauth("https://one.example.com/a", {}, token);
    expect(refreshAccessToken).not.toHaveBeenCalled();

    await fetchWithReauth("https://two.example.com/b", {}, token);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  // The escape hatch: if the tenant ever moves to opaque access tokens, exp is
  // unreadable and this must behave exactly as it did before the change.
  it("falls back to re-auth when the token cannot be read", async () => {
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200));

    await fetchWithReauth("https://any.example.com/api/v1/x", {}, "opaque-token-xyz");

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  // A successful refresh retires the evidence gathered under the token it
  // replaced. Without that, origin A's 401 under the OLD token still counts
  // toward corroboration, so ONE 401 under the new token reaches
  // ORIGINS_BEFORE_DOUBT on a dead token's testimony and re-auths again.
  it("does not let a replaced token's 401 corroborate the next one's", async () => {
    fetchMock.mockResolvedValue(res(401));

    // Token A expires, so this one legitimately refreshes — and records
    // origin A on the way through.
    await fetchWithReauth("https://a.example.com/api/x", {}, deadToken());
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    // Now a DIFFERENT origin refuses the fresh, live token. On its own that is
    // one origin, which is that backend's problem, not our session's.
    await fetchWithReauth("https://b.example.com/api/y", {}, liveToken());
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("leaves non-401 responses alone entirely", async () => {
    fetchMock.mockResolvedValue(res(403));

    const out = await fetchWithReauth("https://any.example.com/a", {}, liveToken());

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(out.status).toBe(403);
  });
});

describe("fetchWithReauth — replaying a non-GET", () => {
  // Every method except GET goes through the same rule; none is special-cased.
  const NON_GET = ["POST", "PUT", "PATCH", "DELETE"];

  // A token already dead when sent never got past the gateway, so no backend
  // ran the request and replaying it cannot duplicate anything.
  it.each(NON_GET)("replays a %s whose token had expired before it was sent", async (method) => {
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200));

    const out = await fetchWithReauth(
      "https://any.example.com/search",
      { method, body: '{"q":"x"}' },
      deadToken(),
    );

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const replay = fetchMock.mock.calls[1][1] as RequestInit & { headers: Record<string, string> };
    expect(replay.method).toBe(method);
    expect(replay.body).toBe('{"q":"x"}');
    expect(replay.headers.Authorization).toBe("Bearer fresh-token");
    expect(out.status).toBe(200);
  });

  // The rest are never replayed, because there a 401 does not prove the
  // request failed to reach business logic. The session is still refreshed.

  // Live when sent, expired by the time the 401 came back: the backend may
  // have done the work before something else refused it.
  it.each(NON_GET)("does not replay a %s whose token expired while it was in flight", async (method) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const token = jwt({ exp: Math.floor(Date.now() / 1000) + 10 });
    fetchMock.mockImplementation(async () => {
      vi.setSystemTime(Date.now() + 120_000);
      return res(401);
    });

    const out = await fetchWithReauth("https://any.example.com/submit", { method }, token);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(401);
  });

  it("does not replay a POST when the token cannot be read", async () => {
    fetchMock.mockResolvedValue(res(401));

    const out = await fetchWithReauth("https://any.example.com/submit", { method: "POST" }, "opaque-token-xyz");

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(401);
  });

  it("does not replay a POST on a live token that two origins refused", async () => {
    fetchMock.mockResolvedValue(res(401));
    const token = liveToken();

    await fetchWithReauth("https://one.example.com/a", { method: "POST" }, token);
    const out = await fetchWithReauth("https://two.example.com/b", { method: "POST" }, token);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // one each, neither replayed
    expect(out.status).toBe(401);
  });

  it("does not replay a POST when the renewal fails", async () => {
    refreshAccessToken.mockRejectedValue(new Error("no session"));
    fetchMock.mockResolvedValue(res(401));

    const out = await fetchWithReauth("https://any.example.com/search", { method: "POST" }, deadToken());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.status).toBe(401);
  });
});
