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
import {
  CONTENTS,
  DECK_SOURCE,
  EMAIL_SOURCE,
  PROSPECTUS_SOURCE,
  SOURCES_RESPONSE,
  TEST_NOW,
  VIDEO_SOURCE,
  WEB_SOURCE,
} from "../testing/fixtures";
import {
  availableKinds,
  filterGroups,
  formatVideoTimestamp,
  freshnessOf,
  groupResults,
  kindOf,
  parseVideoTimestampSeconds,
  sameDocuments,
  strengthOf,
} from "./libraryResults";

const source = (overrides: Partial<SmartSearchSource>): SmartSearchSource => ({ ...EMAIL_SOURCE, ...overrides });

describe("kindOf", () => {
  it("reads the kind from the file type", () => {
    expect(kindOf(source({ fileExtension: "pdf" }))).toBe("pdf");
    expect(kindOf(source({ fileExtension: "pptx" }))).toBe("slides");
    expect(kindOf(source({ fileExtension: "XLSX" }))).toBe("sheet");
    expect(kindOf(source({ fileExtension: "docx" }))).toBe("document");
    expect(kindOf(source({ fileExtension: "webpage" }))).toBe("web");
    expect(kindOf(source({ fileExtension: "reference" }))).toBe("link");
  });

  it("calls a passage with a timestamp a video, whatever the file type says", () => {
    expect(kindOf(source({ fileExtension: "reference", unitLabel: "Moment" }))).toBe("video");
  });

  it("falls back to the unit, then to a document", () => {
    expect(kindOf(source({ fileExtension: "key", unitLabel: "Slide" }))).toBe("slides");
    expect(kindOf(source({ fileExtension: "numbers", unitLabel: "Sheet" }))).toBe("sheet");
    expect(kindOf(source({ fileExtension: "odt", unitLabel: "Section" }))).toBe("document");
  });
});

describe("video timestamps", () => {
  it("reads the second out of the link's query string or hash", () => {
    expect(parseVideoTimestampSeconds("https://x.test/v?t=90")).toBe(90);
    expect(parseVideoTimestampSeconds("https://x.test/v#t=75s")).toBe(75);
  });

  it("has no timestamp when the link has none, or is not a link", () => {
    expect(parseVideoTimestampSeconds("https://x.test/v")).toBeNull();
    expect(parseVideoTimestampSeconds("not a url")).toBeNull();
    expect(parseVideoTimestampSeconds("https://x.test/v?t=-5")).toBeNull();
    expect(parseVideoTimestampSeconds("https://x.test/v?t=1h2m")).toBeNull();
    expect(parseVideoTimestampSeconds("https://x.test/v?t=")).toBeNull();
    expect(parseVideoTimestampSeconds(`https://x.test/v?t=${"9".repeat(30)}`)).toBeNull();
    expect(parseVideoTimestampSeconds(`https://x.test/v?t=${"9".repeat(400)}`)).toBeNull();
  });

  it("formats minutes and seconds, and hours when there are any", () => {
    expect(formatVideoTimestamp(59)).toBe("0:59");
    expect(formatVideoTimestamp(90)).toBe("1:30");
    expect(formatVideoTimestamp(870)).toBe("14:30");
    expect(formatVideoTimestamp(3725)).toBe("1:02:05");
  });
});

describe("groupResults", () => {
  const groups = groupResults(SOURCES_RESPONSE.sources, CONTENTS, "wso2con");

  it("makes one result per document, in the order the best passage of each was ranked", () => {
    expect(groups.map((group) => group.documentId)).toEqual(["1128", "389", "781", "950", "1003"]);
  });

  it("uses the Pitstop item's own title", () => {
    expect(groups.map((group) => group.title)).toEqual([
      "TEST",
      "WSO2Con 2025 - Regional Presentation",
      "WSO2Con Asia - Customer Email",
      "Convince Your Boss - Landing Page",
      "WSO2Con NA 2026 - Sponsorship Prospectus",
    ]);
  });

  it("falls back to the passage's own title when there is no Pitstop item", () => {
    const [group] = groupResults([DECK_SOURCE], [], "q");
    expect(group?.title).toBe("WSO2Con 2025 - Regional Presentation");
    expect(group?.content).toBeUndefined();
  });

  it("keeps all of a document's passages together, and its best score", () => {
    const email = groups.find((group) => group.documentId === "781");
    expect(email?.passages).toHaveLength(2);
    expect(email?.score).toBeCloseTo(0.7619, 4);
  });

  it("gives each result its kind", () => {
    expect(groups.map((group) => group.kind)).toEqual(["pdf", "slides", "document", "web", "pdf"]);
  });

  it("says where in the document each passage is", () => {
    const deck = groups.find((group) => group.documentId === "389");
    const pdf = groups.find((group) => group.documentId === "1128");
    expect(deck?.passages[0]?.location).toBe("Slide 5");
    expect(pdf?.passages[0]?.location).toBe("Page 9");
    const [video] = groupResults([VIDEO_SOURCE], [], "q");
    expect(video?.passages[0]?.location).toBe("14:30");
  });

  it("gives a passage with no position no location", () => {
    const [group] = groupResults([source({ page: null })], [], "q");
    expect(group?.passages[0]?.location).toBeNull();
  });

  it("opens a deck at its slide, a PDF at its Drive link, and a web page at the matching line", () => {
    const byId = (id: string) => groups.find((group) => group.documentId === id)?.passages[0];
    expect(byId("389")?.openUrl).toBe(DECK_SOURCE.nativeLink);
    expect(byId("1128")?.openUrl).toBe("https://drive.google.com/file/d/1yXy8JmH2z7TNmfs1_I30XQTr14cIkU_4/view?usp=drive_link");
    expect(byId("950")?.openUrl).toContain(`${WEB_SOURCE.driveLink}#:~:text=`);
  });

  it("frames only Google Docs, Slides and Sheets", () => {
    const byId = (id: string) => groups.find((group) => group.documentId === id)?.passages[0];
    expect(byId("389")?.embedUrl).toBe(
      "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/embed?slide=id.g2f820b48fab_0_28",
    );
    expect(byId("781")?.embedUrl).toBe(
      "https://docs.google.com/document/d/147x1se01uH1-KGMpWkyqeaPrffADshqCSqfbu-hF0bg/preview",
    );
    expect(byId("1128")?.embedUrl).toBeNull();
    expect(byId("950")?.embedUrl).toBeNull();
  });

  it("returns nothing for no passages", () => {
    expect(groupResults([], [], "q")).toEqual([]);
  });
});

describe("the type filter", () => {
  const groups = groupResults(SOURCES_RESPONSE.sources, CONTENTS, "wso2con");

  it("lists the kinds present, in a fixed order", () => {
    expect(availableKinds(groups)).toEqual(["document", "slides", "pdf", "web"]);
  });

  it("narrows the results to one kind, or keeps them all", () => {
    expect(filterGroups(groups, "pdf").map((group) => group.documentId)).toEqual(["1128", "1003"]);
    expect(filterGroups(groups, "all")).toHaveLength(5);
    expect(filterGroups(groups, "video")).toEqual([]);
  });

  it("never hands back the list it was given", () => {
    expect(filterGroups(groups, "all")).not.toBe(groups);
  });
});

describe("strengthOf", () => {
  it("names a close match strong, a middling one good, and the rest related", () => {
    expect(strengthOf(0.81)).toEqual({ level: 3, label: "Strong match" });
    expect(strengthOf(0.78)).toEqual({ level: 3, label: "Strong match" });
    expect(strengthOf(0.779)).toEqual({ level: 2, label: "Good match" });
    expect(strengthOf(0.7)).toEqual({ level: 2, label: "Good match" });
    expect(strengthOf(0.699)).toEqual({ level: 1, label: "Related" });
  });
});

describe("freshnessOf", () => {
  it("says when an item was added", () => {
    expect(freshnessOf("2026-10-09 04:05:11.801775", TEST_NOW)).toEqual({ label: "Added Oct 2026", stale: false });
  });

  it("flags an item a year old or more, so a seller double-checks it", () => {
    expect(freshnessOf("2024-10-18 04:17:44.848773", TEST_NOW)).toEqual({
      label: "Added Oct 2024 - check it is still current",
      stale: true,
    });
    expect(freshnessOf("2025-10-14 00:00:00", TEST_NOW)?.stale).toBe(true);
    expect(freshnessOf("2025-11-01 00:00:00", TEST_NOW)?.stale).toBe(false);
  });

  it("counts a full year to the day, not by calendar month", () => {
    // TEST_NOW is 14 Oct 2026: the same date a year ago is stale, the day after is not.
    expect(freshnessOf("2025-10-13 23:59:59", TEST_NOW)?.stale).toBe(true);
    expect(freshnessOf("2025-10-14 12:00:00", TEST_NOW)?.stale).toBe(true);
    expect(freshnessOf("2025-10-15 00:00:00", TEST_NOW)?.stale).toBe(false);
    expect(freshnessOf("2025-10-31 00:00:00", TEST_NOW)?.stale).toBe(false);
    expect(freshnessOf("2025-10-31 00:00:00", TEST_NOW)?.label).toBe("Added Oct 2025");
  });

  it("uses the last verified date when there is one", () => {
    expect(freshnessOf("2024-10-18 04:17:44.848773", TEST_NOW, "2026-09-02 08:00:00")).toEqual({
      label: "Last verified Sep 2026",
      stale: false,
    });
    expect(freshnessOf("2026-01-05 00:00:00", TEST_NOW, "2024-12-20 08:00:00")).toEqual({
      label: "Last verified Dec 2024 - check it is still current",
      stale: true,
    });
  });

  it("falls back to the added date when the verified date is missing or unreadable", () => {
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, null)?.label).toBe("Added Oct 2026");
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, "soon")?.label).toBe("Added Oct 2026");
  });

  it("ignores dates that are not real, and uses the added date instead", () => {
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, "0000-00-00 00:00:00")?.label).toBe("Added Oct 2026");
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, "2026-02-30 00:00:00")?.label).toBe("Added Oct 2026");
    expect(freshnessOf("2026-13-01", TEST_NOW)).toBeNull();
  });

  it("ignores a timestamp whose time is not real, and uses the added date instead", () => {
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, "2026-09-02 99:99:99")?.label).toBe("Added Oct 2026");
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, "2026-09-02 24:00:00")?.label).toBe("Added Oct 2026");
    expect(freshnessOf("2026-10-09 04:05:11", TEST_NOW, "2026-09-02xyz")?.label).toBe("Added Oct 2026");
  });

  it("reads the usual shapes of a timestamp", () => {
    for (const stamp of [
      "2026-09-02",
      "2026-09-02 08:00:00",
      "2026-09-02 08:00:00.123456",
      "2026-09-02T08:00:00Z",
      "2026-09-02T08:00:00.000+05:30",
      "2026-09-02 08:00",
    ]) {
      expect(freshnessOf(undefined, TEST_NOW, stamp)?.label).toBe("Last verified Sep 2026");
    }
  });

  it("says nothing when the date can't be read", () => {
    expect(freshnessOf(undefined, TEST_NOW)).toBeNull();
    expect(freshnessOf("", TEST_NOW)).toBeNull();
    expect(freshnessOf("last week", TEST_NOW)).toBeNull();
  });
});

describe("sameDocuments", () => {
  const groups = groupResults(SOURCES_RESPONSE.sources, CONTENTS, "wso2con");

  it("is true when the answer was written from the documents on screen", () => {
    expect(sameDocuments(groups, SOURCES_RESPONSE.sources)).toBe(true);
  });

  it("is false when the answer used a document that isn't shown, or skipped one that is", () => {
    expect(sameDocuments(groups, [...SOURCES_RESPONSE.sources, PROSPECTUS_SOURCE, source({ documentId: "9" })])).toBe(false);
    expect(sameDocuments(groups, SOURCES_RESPONSE.sources.slice(0, 2))).toBe(false);
  });
});
