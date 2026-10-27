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
import {
  decodePromotionText,
  encodePromotionText,
  isEmptyPromotionHtml,
  sanitizePromotionHtml,
} from "./promotionRichText";

describe("the wire encoding", () => {
  it("round-trips a plain statement", () => {
    const html = "<p>Consistently exceeds expectations.</p>";
    expect(decodePromotionText(encodePromotionText(html))).toBe(html);
  });

  it("round-trips characters btoa alone cannot carry", () => {
    const html = "<p>සිංහල — “smart quotes”, 日本語, 🎯</p>";
    expect(decodePromotionText(encodePromotionText(html))).toBe(html);
  });
});

describe("decoding a field that isn't there", () => {
  it("reads an absent field as empty", () => {
    expect(decodePromotionText(undefined)).toBe("");
    expect(decodePromotionText(null)).toBe("");
    expect(decodePromotionText("")).toBe("");
  });

  it("returns a genuinely plain-text field as-is, not empty", () => {
    // Unlike a decode failure meaning "there's nothing here" (this field IS
    // there, it's just never been base64 to begin with) — source's own
    // defensive decodeBase64 falls back to the raw value for exactly this
    // reason, and this port matches that rather than swallowing it.
    expect(decodePromotionText("just a plain reason, not base64")).toBe(
      "just a plain reason, not base64",
    );
  });

  it("sanitizes on the way out even for a field that was never base64", () => {
    expect(decodePromotionText("<script>steal()</script>plain text")).toBe("plain text");
  });

  it("sanitizes on the way out, not just on the way into the editor", () => {
    const stored = encodePromotionText("<p>hi</p><script>steal()</script>");
    expect(decodePromotionText(stored)).toBe("<p>hi</p>");
  });
});

describe("sanitizing", () => {
  it("keeps the formatting the editor is allowed to produce", () => {
    const html = "<p><strong>Shipped</strong> the <em>port</em>.</p><ul><li>One</li></ul>";
    expect(sanitizePromotionHtml(html)).toBe(html);
  });

  it("strips a script tag", () => {
    expect(sanitizePromotionHtml("<p>hi</p><script>steal()</script>")).toBe("<p>hi</p>");
  });

  it("strips an event-handler attribute but keeps the element", () => {
    const clean = sanitizePromotionHtml('<p onclick="steal()">hi</p>');
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("hi");
  });
});

describe("spotting an empty answer", () => {
  it("treats an untouched editor as empty", () => {
    expect(isEmptyPromotionHtml("<p><br></p>")).toBe(true);
    expect(isEmptyPromotionHtml("<p>&nbsp;</p>")).toBe(true);
    expect(isEmptyPromotionHtml("")).toBe(true);
  });

  it("treats a real answer as not empty", () => {
    expect(isEmptyPromotionHtml("<p>Ready for the next band.</p>")).toBe(false);
  });
});
