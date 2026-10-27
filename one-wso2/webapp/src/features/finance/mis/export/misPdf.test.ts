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

import { describe, expect, it, vi } from "vitest";
import { MIS_NUMBER_FORMATS, type MisWorkbookSpec } from "./misWorkbook";
import { MIS_SCALES } from "../util/misViewVocabulary";

const written: string[] = [];
const visited: number[] = [];

vi.mock("@utils/saveFile", () => ({ saveBlob: vi.fn() }));

vi.mock("jspdf", () => ({
  default: class JsPDF {
    internal = {
      pageSize: {
        getWidth: () => 842,
        getHeight: () => 595,
      },
    };

    setFontSize() {}

    setTextColor() {}

    text(value: string) {
      written.push(value);
    }

    getNumberOfPages() {
      return 2;
    }

    setPage(page: number) {
      visited.push(page);
    }

    output() {
      return new ArrayBuffer(0);
    }
  },
}));

vi.mock("jspdf-autotable", () => ({ default: () => {} }));

const { saveMisPdf } = await import("./misPdf");

const spec: MisWorkbookSpec = {
  sheets: [
    {
      name: "Subscription",
      columns: [{ width: 20 }, { width: 14 }],
      rows: [
        { cells: [{ value: "All amounts in USD" }] },
        { cells: [] },
        { bold: true, cells: [{ value: "Summary" }, { value: "ARR" }] },
        { cells: [{ value: "Opening ARR" }, { value: 1500, numFmt: MIS_NUMBER_FORMATS.CURRENCY }] },
      ],
    },
  ],
};

describe("saveMisPdf", () => {
  it("prints the final page count on every page", async () => {
    written.length = 0;
    visited.length = 0;
    await saveMisPdf(
      spec,
      { title: "ARR Dashboard", lines: ["Annually"], scale: MIS_SCALES.UNITS },
      "arr.pdf",
    );
    expect(visited).toEqual([1, 2]);
    expect(written).toContain("Page 1 of 2");
    expect(written).toContain("Page 2 of 2");
  });
});
