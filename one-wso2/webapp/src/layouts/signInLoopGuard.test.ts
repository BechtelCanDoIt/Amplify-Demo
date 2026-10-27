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
import {
  SIGN_IN_LOOP_WINDOW_MS,
  SIGN_IN_REDIRECT_KEY,
  forgetSignInRedirect,
  rememberSignInRedirect,
  signInRedirectIsRecent,
} from "./signInLoopGuard";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("signInLoopGuard", () => {
  it("has nothing recent before any redirect", () => {
    expect(signInRedirectIsRecent()).toBe(false);
  });

  it("reports a redirect as recent inside the window", () => {
    rememberSignInRedirect(1_000_000);
    expect(signInRedirectIsRecent(1_000_000 + SIGN_IN_LOOP_WINDOW_MS - 1)).toBe(true);
  });

  it("stops reporting it once the window has passed", () => {
    rememberSignInRedirect(1_000_000);
    expect(signInRedirectIsRecent(1_000_000 + SIGN_IN_LOOP_WINDOW_MS)).toBe(false);
  });

  it("forgets it", () => {
    rememberSignInRedirect();
    forgetSignInRedirect();
    expect(signInRedirectIsRecent()).toBe(false);
  });

  it("does not trust a record from the future", () => {
    rememberSignInRedirect(2_000_000);
    expect(signInRedirectIsRecent(1_000_000)).toBe(false);
  });

  it("ignores a record it cannot read as a time", () => {
    sessionStorage.setItem(SIGN_IN_REDIRECT_KEY, "not-a-time");
    expect(signInRedirectIsRecent()).toBe(false);
  });

  // Failing open is the whole contract: a storage failure may cost the loop
  // guard, never a sign-in.
  it("fails open when storage cannot be used", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(blocked);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(blocked);

    expect(() => rememberSignInRedirect()).not.toThrow();
    expect(() => forgetSignInRedirect()).not.toThrow();
    expect(signInRedirectIsRecent()).toBe(false);
  });
});
