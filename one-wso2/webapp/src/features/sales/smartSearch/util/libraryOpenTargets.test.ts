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
import type { SmartSearchSource } from "../api/smartSearchTypes";
import { DECK_SOURCE, PROSPECTUS_SOURCE, WEB_SOURCE } from "../testing/fixtures";
import { embedUrlFor, isHttpsUrl, isTrustedGoogleLink, openTargetFor, withTextFragment } from "./libraryOpenTargets";

const source = (overrides: Partial<SmartSearchSource>): SmartSearchSource => ({ ...DECK_SOURCE, ...overrides });

describe("isTrustedGoogleLink", () => {
  it("accepts https Drive and Docs links", () => {
    expect(isTrustedGoogleLink("https://docs.google.com/document/d/abc/edit")).toBe(true);
    expect(isTrustedGoogleLink("https://drive.google.com/file/d/abc/view")).toBe(true);
  });

  it("rejects look-alikes, other schemes and non-links", () => {
    expect(isTrustedGoogleLink("http://docs.google.com/document/d/abc")).toBe(false);
    expect(isTrustedGoogleLink("https://docs.google.com.evil.example/document/d/abc")).toBe(false);
    expect(isTrustedGoogleLink("https://evil.example/docs.google.com/document/d/abc")).toBe(false);
    expect(isTrustedGoogleLink("https://notdocs.google.com/x")).toBe(false);
    expect(isTrustedGoogleLink("javascript:alert(1)")).toBe(false);
    expect(isTrustedGoogleLink("not a url")).toBe(false);
  });
});

describe("isHttpsUrl", () => {
  it("accepts only https", () => {
    expect(isHttpsUrl("https://wso2.com/a")).toBe(true);
    expect(isHttpsUrl("http://wso2.com/a")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("")).toBe(false);
  });
});

describe("withTextFragment", () => {
  it("points at the line holding most of the question's words", () => {
    const url = withTextFragment("https://x.test/p", "Intro\nPricing and discounts for partners\nOther", "pricing discounts");
    expect(url).toBe("https://x.test/p#:~:text=Pricing%20and%20discounts%20for%20partners");
  });

  it("escapes a hyphen, which would otherwise break the match", () => {
    expect(withTextFragment("https://x.test/p", "Well-known partner", "partner")).toContain("Well%2Dknown");
  });

  it("keeps a fragment the link already has", () => {
    expect(withTextFragment("https://x.test/p#top", "Pricing", "pricing")).toBe("https://x.test/p#top:~:text=Pricing");
  });

  it("leaves the link alone when there is no text, or it can't be parsed", () => {
    expect(withTextFragment("https://x.test/p", "", "pricing")).toBe("https://x.test/p");
    expect(withTextFragment("not a url", "Pricing", "pricing")).toBe("not a url");
  });

  it("cuts a long line on a word boundary", () => {
    const long = `${"word ".repeat(40)}end`;
    const fragment = decodeURIComponent(withTextFragment("https://x.test/p", long, "q").split(":~:text=")[1] ?? "");
    expect(fragment.length).toBeLessThanOrEqual(120);
    expect(fragment.endsWith(" ")).toBe(false);
  });
});

describe("openTargetFor", () => {
  it("prefers a deep link into the slide, heading or moment", () => {
    expect(openTargetFor(DECK_SOURCE, "q")).toBe(DECK_SOURCE.nativeLink);
  });

  it("opens a Drive file at its link", () => {
    expect(openTargetFor(PROSPECTUS_SOURCE, "q")).toBe(PROSPECTUS_SOURCE.driveLink);
  });

  it("opens a web page at the matching line", () => {
    expect(openTargetFor(WEB_SOURCE, "agentic")).toContain(`${WEB_SOURCE.driveLink}#:~:text=`);
  });

  it("opens a stand-in result at the item's own https link", () => {
    expect(openTargetFor(source({ fileExtension: "reference", nativeLink: "", driveLink: "https://wso2.com/x" }), "q")).toBe(
      "https://wso2.com/x",
    );
  });

  it("has nowhere to go for a link that isn't safe", () => {
    expect(openTargetFor(source({ fileExtension: "reference", nativeLink: "", driveLink: "http://wso2.com/x" }), "q")).toBeNull();
    expect(openTargetFor(source({ fileExtension: "webpage", nativeLink: "", driveLink: "javascript:alert(1)" }), "q")).toBeNull();
    expect(openTargetFor(source({ nativeLink: "", driveLink: "https://docs.google.com.evil.example/x" }), "q")).toBeNull();
  });

  it("ignores a deep link that isn't on Google, and falls back to the file", () => {
    expect(openTargetFor(source({ nativeLink: "https://evil.example/x" }), "q")).toBe(DECK_SOURCE.driveLink);
  });
});

describe("embedUrlFor", () => {
  it("frames a Google Doc as a preview", () => {
    expect(embedUrlFor(source({ driveLink: "https://docs.google.com/document/d/AbC-123_x/edit", nativeLink: "" }))).toBe(
      "https://docs.google.com/document/d/AbC-123_x/preview",
    );
  });

  it("frames a Google Sheet as a page", () => {
    expect(embedUrlFor(source({ driveLink: "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0", nativeLink: "" }))).toBe(
      "https://docs.google.com/spreadsheets/d/abc123/htmlview",
    );
  });

  it("frames a deck at the slide the link names", () => {
    expect(embedUrlFor(DECK_SOURCE)).toBe(
      "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/embed?slide=id.g2f820b48fab_0_28",
    );
  });

  it("frames a deck at its slide number when the link names no slide", () => {
    const deck = source({ nativeLink: "", page: 7 });
    expect(embedUrlFor(deck)).toMatch(/\/embed\?slide=7$/);
  });

  it("ignores a slide name it doesn't recognise", () => {
    const deck = source({ nativeLink: "https://docs.google.com/presentation/d/x/present?slide=id.a%20b%3Cscript%3E", page: 3 });
    expect(embedUrlFor(deck)).toMatch(/\/embed\?slide=3$/);
  });

  it("frames the whole deck when there is no slide to name", () => {
    expect(embedUrlFor(source({ nativeLink: "", page: null }))).toMatch(/\/embed$/);
  });

  it("never frames a Drive file, a web page or a look-alike host", () => {
    expect(embedUrlFor(PROSPECTUS_SOURCE)).toBeNull();
    expect(embedUrlFor(WEB_SOURCE)).toBeNull();
    expect(embedUrlFor(source({ driveLink: "https://docs.google.com.evil.example/document/d/abc/edit" }))).toBeNull();
    expect(embedUrlFor(source({ driveLink: "http://docs.google.com/document/d/abc/edit" }))).toBeNull();
    expect(embedUrlFor(source({ driveLink: "https://docs.google.com/forms/d/abc/edit" }))).toBeNull();
  });

  it("builds the address from the file id alone, so nothing else in the link comes along", () => {
    const url = embedUrlFor(source({ driveLink: "https://docs.google.com/document/d/abc/edit?usp=sharing&x=<script>", nativeLink: "" }));
    expect(url).toBe("https://docs.google.com/document/d/abc/preview");
  });

  it("is null for a link that can't be read", () => {
    expect(embedUrlFor(source({ driveLink: "not a url" }))).toBeNull();
  });
});
