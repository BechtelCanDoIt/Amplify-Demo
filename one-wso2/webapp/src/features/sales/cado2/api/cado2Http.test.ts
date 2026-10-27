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

import { afterEach, describe, expect, it, vi } from "vitest";
import { cado2Pdf } from "./cado2Http";

vi.mock("@api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@api/http")>()),
  fetchWithReauth: (url: string, init: RequestInit) => fetch(url, init),
}));

afterEach(() => vi.unstubAllGlobals());

const answer = (body: string, type: string, status = 200) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "Content-Type": type } })));

describe("cado2Pdf", () => {
  it("returns an order form PDF as a PDF blob", async () => {
    answer("%PDF-1.7", "application/pdf");
    const blob = await cado2Pdf("GET", "/file", "tok");
    expect(blob.type).toBe("application/pdf");
  });

  it("refuses anything that isn't a PDF, so no other document runs with the app's origin", async () => {
    answer("<script>alert(1)</script>", "text/html");
    await expect(cado2Pdf("GET", "/file", "tok")).rejects.toThrow();
  });

  it("throws the shared HttpError on a refusal", async () => {
    answer('{"message":"Not yours"}', "application/json", 403);
    await expect(cado2Pdf("POST", "/preview", "tok")).rejects.toMatchObject({ status: 403 });
  });
});
