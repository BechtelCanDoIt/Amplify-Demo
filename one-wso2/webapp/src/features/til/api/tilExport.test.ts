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
import type { TilSubmissionWire } from "./tilTypes";
import { collectTilPages, TIL_EXPORT_PAGE_SIZE } from "./useTilData";

function wire(id: string): TilSubmissionWire {
  return {
    id,
    title: "T",
    who: "Jane",
    where: "Internal",
    whereDetail: null,
    what: "<p>x</p>",
    submittedByEmail: "jane@example.com",
    createdAt: "2026-10-14T09:00:00Z",
  };
}

const ids = (from: number, count: number) => Array.from({ length: count }, (_, i) => wire(`e${from + i}`));

describe("collectTilPages", () => {
  it("reads every page until the total is reached", async () => {
    const total = TIL_EXPORT_PAGE_SIZE * 2 + 50;
    const fetchPage = vi.fn(async (offset: number) => ({
      items: ids(offset, Math.min(TIL_EXPORT_PAGE_SIZE, total - offset)),
      total,
      limit: TIL_EXPORT_PAGE_SIZE,
      offset,
    }));
    const entries = await collectTilPages(fetchPage);
    expect(fetchPage.mock.calls.map(([offset]) => offset)).toEqual([0, TIL_EXPORT_PAGE_SIZE, TIL_EXPORT_PAGE_SIZE * 2]);
    expect(entries).toHaveLength(total);
    expect(entries[0].createdAt).toBeInstanceOf(Date);
  });

  it("stops after a short page, and keeps an entry that shifted across pages once", async () => {
    const pages = [
      { items: ids(0, TIL_EXPORT_PAGE_SIZE), total: 150, limit: TIL_EXPORT_PAGE_SIZE, offset: 0 },
      // An entry shared mid-export pushed e99 onto the next page.
      { items: [wire("e99"), ...ids(100, 49)], total: 151, limit: TIL_EXPORT_PAGE_SIZE, offset: TIL_EXPORT_PAGE_SIZE },
    ];
    const fetchPage = vi.fn(async (offset: number) => pages[offset / TIL_EXPORT_PAGE_SIZE]);
    const entries = await collectTilPages(fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(entries).toHaveLength(149);
    expect(new Set(entries.map((e) => e.id)).size).toBe(149);
  });

  it("makes one request for an empty result", async () => {
    const fetchPage = vi.fn(async () => ({ items: [], total: 0, limit: TIL_EXPORT_PAGE_SIZE, offset: 0 }));
    expect(await collectTilPages(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
