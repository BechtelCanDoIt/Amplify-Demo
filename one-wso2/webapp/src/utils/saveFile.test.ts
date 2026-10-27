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
import { saveBlob } from "./saveFile";

// What saveBlob hands the browser is the blob behind the object URL, so that is
// where this looks. jsdom implements neither half of the object-URL API, and a
// real click would try to navigate, so all three are stood in for here.
let handed: Blob | undefined;

beforeEach(() => {
  handed = undefined;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    handed = blob;
    return "blob:saved";
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Shared since MIS's export moved it here, and built for the next port — so its
// caller's content type is not something it can take on trust. The same rule
// as financeReceipts's `safeType`: a type nobody vouched for goes out as bare
// bytes, so a mislabelled HTML payload is never handed to the browser as HTML.
describe("saving a file", () => {
  it("hands over a type it does not know as plain bytes", () => {
    saveBlob(new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "report.html");
    expect(handed?.type).toBe("application/octet-stream");
  });

  // MIS's Excel export and People Ops' employee report.
  it("keeps the type of a format this app writes", () => {
    for (const type of [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv;charset=utf-8",
    ]) {
      saveBlob(new Blob(["x"], { type }), "export");
      expect(handed?.type, type).toBe(type);
    }
  });
});
