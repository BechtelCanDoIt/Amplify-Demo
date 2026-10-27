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
import { highlightParts, queryWords, snippetOf } from "./libraryHighlight";

describe("queryWords", () => {
  it("keeps the words of a question that can match: longer than three letters, not filler", () => {
    expect(queryWords("How do we answer a security questionnaire?")).toEqual(["answer", "security", "questionnaire"]);
    expect(queryWords("What is the pricing?")).toEqual(["pricing"]);
  });

  it("lists each word once, in lower case, and no more than eight", () => {
    expect(queryWords("Pricing PRICING pricing")).toEqual(["pricing"]);
    expect(queryWords("alpha bravo charlie delta echoes foxtrot golfer hotel india juliet")).toHaveLength(8);
  });

  it("has none for an empty or all-filler question", () => {
    expect(queryWords("")).toEqual([]);
    expect(queryWords("what is this")).toEqual([]);
  });
});

describe("highlightParts", () => {
  it("marks the whole words that match, whatever their case", () => {
    expect(highlightParts("Pricing and security", "pricing")).toEqual([
      { text: "Pricing", match: true },
      { text: " and security", match: false },
    ]);
  });

  it("always joins back into the original text", () => {
    const text = "The pricing page, the Pricing deck and PRICING notes.";
    const parts = highlightParts(text, "pricing deck");
    expect(parts.map((part) => part.text).join("")).toBe(text);
    expect(parts.filter((part) => part.match).map((part) => part.text.toLowerCase())).toEqual([
      "pricing",
      "pricing",
      "deck",
      "pricing",
    ]);
  });

  it("does not mark part of a longer word", () => {
    expect(highlightParts("pricings and repricing", "pricing")).toEqual([{ text: "pricings and repricing", match: false }]);
  });

  it("returns the text as one plain piece when there is nothing to look for", () => {
    expect(highlightParts("Some text", "")).toEqual([{ text: "Some text", match: false }]);
    expect(highlightParts("", "pricing")).toEqual([{ text: "", match: false }]);
  });

  it("is not fooled by characters that mean something in a pattern", () => {
    expect(() => highlightParts("a (b) [c] c++ text", "c++ (text) [x*]")).not.toThrow();
  });
});

describe("snippetOf", () => {
  it("leaves a short passage as it is, with its whitespace tidied", () => {
    expect(snippetOf("  One\n\n two   three ")).toBe("One two three");
  });

  it("cuts a long passage on a word boundary and says so", () => {
    const long = "word ".repeat(100);
    const snippet = snippetOf(long, 40);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(41);
    expect(snippet.slice(0, -1).endsWith(" ")).toBe(false);
  });

  it("cuts mid-word only when there is no space to cut at", () => {
    expect(snippetOf("x".repeat(50), 10)).toBe(`${"x".repeat(10)}…`);
  });
});
