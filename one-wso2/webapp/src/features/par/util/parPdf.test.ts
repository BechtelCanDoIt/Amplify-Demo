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
import { htmlToPdfText } from "./parPdf";

describe("htmlToPdfText", () => {
  it("keeps text sitting beside inline formatting, not just the formatted word", () => {
    const text = htmlToPdfText("<p>Hello <b>world</b> again</p>");
    expect(text).toContain("Hello world again");
  });

  it("keeps every paragraph on its own line", () => {
    const text = htmlToPdfText("<p>First para</p><p>Second <em>para</em></p>");
    expect(text.split("\n").map((l) => l.trim())).toEqual(["First para", "Second para"]);
  });

  it("still renders an unordered list as bullet lines", () => {
    const text = htmlToPdfText("<ul><li>Item one</li><li>Item <b>two</b></li></ul>");
    const lines = text.split("\n").map((l) => l.trim());
    expect(lines).toEqual(["• Item one", "• Item two"]);
  });

  it("still numbers an ordered list", () => {
    const text = htmlToPdfText("<ol><li>First</li><li>Second</li></ol>");
    const lines = text.split("\n").map((l) => l.trim());
    expect(lines).toEqual(["1. First", "2. Second"]);
  });

  it("falls back to a dash for empty content", () => {
    expect(htmlToPdfText("")).toBe("-");
  });
});
