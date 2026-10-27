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
import { normalizeSubmission, type TilSubmission } from "../api/tilTypes";
import { tilArticlePath } from "./tilArticleView";
import { buildTilCsv, tilExportFilename, tilExportText } from "./tilExportCsv";

// Built through normalizeSubmission, so the fixture always has every field
// TilSubmission has, whatever this branch adds to it.
function entry(overrides: Partial<TilSubmission>): TilSubmission {
  return {
    ...normalizeSubmission({
      id: "e1",
      title: "Ask for the token lifetimes first",
      who: "Alex Sample",
      where: "Internal",
      whereDetail: null,
      what: "<p>Learned it.</p>",
      submittedByEmail: "alex@example.com",
      createdAt: "2026-10-14T00:00:00Z",
    }),
    createdAt: new Date(2026, 9, 14, 9, 5),
    ...overrides,
  };
}

const ORIGIN = "https://one.example";

describe("buildTilCsv", () => {
  it("writes the header, then one row per entry in the order given", () => {
    const csv = buildTilCsv([entry({ id: "a", title: "First" }), entry({ id: "b", title: "Second" })], ORIGIN);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Title,Source,Customer or partner,Author,Date,Learning,Link");
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith("First,")).toBe(true);
    expect(lines[2].startsWith("Second,")).toBe(true);
  });

  it("writes a full row: local date, plain-text learning and an absolute article link", () => {
    const [, row] = buildTilCsv([entry({})], ORIGIN).split("\r\n");
    expect(row).toBe(
      `Ask for the token lifetimes first,Internal,,Alex Sample,2026-10-14 09:05,Learned it.,${ORIGIN}${tilArticlePath("e1")}`,
    );
  });

  it("puts customer and partner names in their own column, and keeps an Other entry's explanation with its source", () => {
    const rows = buildTilCsv(
      [
        entry({ where: "Customer", whereDetail: "Acme Bank" }),
        entry({ where: "Partner", whereDetail: "Acme Reseller" }),
        entry({ where: "Other", whereDetail: "A conference" }),
        entry({ where: "Internal", whereDetail: null }),
      ],
      ORIGIN,
    )
      .split("\r\n")
      .slice(1)
      .map((line) => line.split(",").slice(1, 3));
    expect(rows).toEqual([
      ["Customer", "Acme Bank"],
      ["Partner", "Acme Reseller"],
      ["Other: A conference", ""],
      ["Internal", ""],
    ]);
  });

  it("quotes cells with commas, quotes or line breaks, doubling the quotes", () => {
    const [, row] = buildTilCsv(
      [entry({ title: 'Say "no", politely', what: "<p>One</p><p>Two</p>" })],
      ORIGIN,
      // Rows end in \r\n; the line break inside the cell is a bare \n.
    ).split("\r\n");
    expect(row.startsWith('"Say ""no"", politely",')).toBe(true);
    expect(row).toContain('"One\nTwo"');
  });

  it("keeps spreadsheets from reading people's text as a formula", () => {
    const csv = buildTilCsv(
      [entry({ title: "=HYPERLINK(\"https://evil.example\")", who: "@someone", what: "<p>-5 tips</p>" })],
      ORIGIN,
    );
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.example"")"`);
    expect(csv).toContain(",'@someone,");
    expect(csv).toContain(",'-5 tips,");
  });
});

describe("tilExportText", () => {
  it("keeps one paragraph or list item per line, marking list items", () => {
    expect(tilExportText("<p>Steps:</p><ul><li>Retry</li><li><strong>Check</strong> logs</li></ul><p>Done</p>")).toBe(
      "Steps:\n• Retry\n• Check logs\nDone",
    );
  });

  it("decodes entities and line breaks, and drops empty lines", () => {
    expect(tilExportText("<p>R&amp;D&nbsp;team<br>next line</p><p><br></p>")).toBe("R&D team\nnext line");
  });

  it("breaks the line at any form of <br>", () => {
    expect(tilExportText('<p>One<br/>Two<br />Three<br class="soft">Four</p>')).toBe("One\nTwo\nThree\nFour");
  });
});

describe("tilExportFilename", () => {
  it("dates the file in local time", () => {
    expect(tilExportFilename(new Date(2026, 0, 5, 23, 59))).toBe("today-i-learned-2026-01-05.csv");
  });
});
