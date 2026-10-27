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

import { beforeEach, describe, expect, it } from "vitest";
import {
  ORIGINS_BEFORE_DOUBT,
  classifyToken,
  noteUnauthorized,
  resetUnauthorizedOrigins,
} from "./tokenExpiry";

/**
 * A JWT with the given payload. Unsigned — nothing here reads the signature.
 *
 * UTF-8 encoded before base64, which is what a real IdP emits: `btoa` alone
 * throws on any non-Latin-1 character, so a naive helper cannot even build the
 * multi-byte case it is meant to prove.
 */
function jwt(payload: Record<string, unknown>): string {
  const seg = (o: unknown) => {
    const utf8 = new TextEncoder().encode(JSON.stringify(o));
    const bin = Array.from(utf8, (b) => String.fromCharCode(b)).join("");
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  return `${seg({ alg: "RS256", typ: "JWT" })}.${seg(payload)}.sig`;
}

const NOW = Date.UTC(2026, 8, 17, 12, 0, 0);
const atSec = (ms: number) => Math.floor(ms / 1000);

describe("classifyToken", () => {
  it("reads a future exp as live", () => {
    const t = classifyToken(jwt({ exp: atSec(NOW) + 600 }), NOW);
    expect(t.kind).toBe("live");
  });

  it("reads a past exp as expired", () => {
    const t = classifyToken(jwt({ exp: atSec(NOW) - 600 }), NOW);
    expect(t.kind).toBe("expired");
  });

  // Erring toward "live" costs one pointless re-auth; erring the other way
  // would suppress a real one, so the tolerance only ever extends life.
  it("treats a just-expired token as live, within clock tolerance", () => {
    const t = classifyToken(jwt({ exp: atSec(NOW) - 10 }), NOW);
    expect(t.kind).toBe("live");
  });

  it("treats a token past the tolerance as expired", () => {
    const t = classifyToken(jwt({ exp: atSec(NOW) - 31 }), NOW);
    expect(t.kind).toBe("expired");
  });

  // "unknown" is the fall-back-to-old-behaviour signal. If these ever started
  // returning "live", switching the tenant to opaque access tokens would
  // silently stop every re-auth in the app.
  it.each([
    ["an empty string", ""],
    ["an opaque token", "not-a-jwt-at-all"],
    ["a JWT with no exp", jwt({ sub: "u1" })],
    ["a JWT with a non-numeric exp", jwt({ exp: "soon" })],
    ["a JWT with an unreadable payload", "aaa.@@@not-base64@@@.sig"],
  ])("reports %s as unknown", (_label, token) => {
    expect(classifyToken(token, NOW).kind).toBe("unknown");
  });

  // Not a token shape any IdP emits, but "live" is the answer that SUPPRESSES
  // a re-auth, so anything of an unexpected shape has to land on unknown —
  // which restores the old conduct rather than narrowing it. Both of these
  // carry a perfectly readable future `exp` in segment two, and both read as
  // live if the check is `>= 2` segments instead of exactly 3.
  it.each([
    ["two segments", 2],
    ["four segments", 4],
  ])("reports a %s token as unknown, however readable its payload", (_label, count) => {
    const three = jwt({ exp: atSec(NOW) + 600 }).split(".");
    const token = count === 2 ? three.slice(0, 2).join(".") : [...three, "extra"].join(".");
    expect(classifyToken(token, NOW).kind).toBe("unknown");
  });

  it("carries the expiry back so a caller can say when", () => {
    const exp = atSec(NOW) + 600;
    const t = classifyToken(jwt({ exp }), NOW);
    expect(t.kind === "live" && t.expiresAt).toBe(exp * 1000);
  });

  it("survives multi-byte claims", () => {
    const t = classifyToken(jwt({ exp: atSec(NOW) + 600, name: "Håkan 東京" }), NOW);
    expect(t.kind).toBe("live");
  });
});

describe("noteUnauthorized", () => {
  beforeEach(() => resetUnauthorizedOrigins());

  // THE case this exists for: one faulty backend, however many times it fails,
  // must never look like our credentials are dead.
  it("never corroborates from a single origin, however many 401s", () => {
    for (let i = 0; i < 20; i++) {
      expect(noteUnauthorized(`https://faulty.example.com/api/v1/thing/${i}`, NOW)).toBe(false);
    }
  });

  it("corroborates once a second distinct origin refuses", () => {
    expect(noteUnauthorized("https://one.example.com/a", NOW)).toBe(false);
    expect(noteUnauthorized("https://two.example.com/b", NOW)).toBe(true);
  });

  it("counts origins, not paths", () => {
    noteUnauthorized("https://one.example.com/a", NOW);
    expect(noteUnauthorized("https://one.example.com/b", NOW)).toBe(false);
  });

  // Without expiry, two unrelated backend outages hours apart would eventually
  // add up to a verdict about the session.
  it("forgets an origin once the window has passed", () => {
    expect(noteUnauthorized("https://one.example.com/a", NOW)).toBe(false);
    expect(noteUnauthorized("https://two.example.com/b", NOW + 61_000)).toBe(false);
  });

  it("clears on sign-out, so one session cannot seed the next", () => {
    noteUnauthorized("https://one.example.com/a", NOW);
    resetUnauthorizedOrigins();
    expect(noteUnauthorized("https://two.example.com/b", NOW)).toBe(false);
  });

  it("needs exactly ORIGINS_BEFORE_DOUBT distinct origins", () => {
    for (let i = 1; i < ORIGINS_BEFORE_DOUBT; i++) {
      expect(noteUnauthorized(`https://host${i}.example.com/a`, NOW)).toBe(false);
    }
    expect(noteUnauthorized(`https://host${ORIGINS_BEFORE_DOUBT}.example.com/a`, NOW)).toBe(true);
  });
});
