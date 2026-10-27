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

import { describe, expect, it } from "vitest";
import { isSilentSignInFrame } from "./silentSignInFrame";

function page({ framed, search }: { framed: boolean; search: string }): Window {
  const self = {};
  return { self, top: framed ? {} : self, location: { search } } as unknown as Window;
}

describe("isSilentSignInFrame", () => {
  it("is true for an authorization code landing inside a frame", () => {
    expect(isSilentSignInFrame(page({ framed: true, search: "?code=abc&session_state=x&state=instance_0_request_3" }))).toBe(true);
  });

  it("is true for a refused silent sign-in landing inside a frame", () => {
    expect(isSilentSignInFrame(page({ framed: true, search: "?error=login_required&state=instance_0_request_3" }))).toBe(true);
  });

  it("is false for the same response at the top level, which is an ordinary sign-in", () => {
    expect(isSilentSignInFrame(page({ framed: false, search: "?code=abc&state=instance_0_request_3" }))).toBe(false);
  });

  it("is false for a page embedded on purpose", () => {
    expect(isSilentSignInFrame(page({ framed: true, search: "" }))).toBe(false);
    expect(isSilentSignInFrame(page({ framed: true, search: "?tab=history" }))).toBe(false);
  });

  it("is false for the sign-out landing, which carries a state but no response", () => {
    expect(isSilentSignInFrame(page({ framed: true, search: "?state=sign_out_success" }))).toBe(false);
  });

  it("is false for a stray code with no state", () => {
    expect(isSilentSignInFrame(page({ framed: true, search: "?code=abc" }))).toBe(false);
  });
});
