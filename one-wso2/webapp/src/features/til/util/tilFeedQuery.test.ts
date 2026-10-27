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
import { startOfLocalDay, tilFeedQuery } from "./tilFeedQuery";

const none = { search: "", dateFrom: "", dateTo: "", mine: false };

describe("startOfLocalDay", () => {
  it("is local midnight of that day, as an ISO time", () => {
    expect(startOfLocalDay("2026-10-01")).toBe(new Date(2026, 9, 1).toISOString());
  });

  it("can move on by days, across a month end", () => {
    expect(startOfLocalDay("2026-10-31", 1)).toBe(new Date(2026, 10, 1).toISOString());
  });
});

describe("tilFeedQuery", () => {
  it("asks for the page in view", () => {
    expect(tilFeedQuery(none, 1, 10)).toEqual({ limit: 10, offset: 0 });
    expect(tilFeedQuery(none, 3, 5)).toEqual({ limit: 5, offset: 10 });
  });

  it("never asks for a page before the first", () => {
    expect(tilFeedQuery(none, 0, 10).offset).toBe(0);
  });

  it("sends the search trimmed, and leaves out a blank one", () => {
    expect(tilFeedQuery({ ...none, search: "  idempotency keys " }, 1, 10).search).toBe("idempotency keys");
    expect(tilFeedQuery({ ...none, search: "   " }, 1, 10)).not.toHaveProperty("search");
  });

  it("turns the local days into a range that covers the whole last day", () => {
    const q = tilFeedQuery({ ...none, dateFrom: "2026-10-01", dateTo: "2026-10-31" }, 1, 10);
    expect(q.createdFrom).toBe(new Date(2026, 9, 1).toISOString());
    expect(q.createdBefore).toBe(new Date(2026, 10, 1).toISOString());
  });

  it("sends a single day as that day", () => {
    const q = tilFeedQuery({ ...none, dateFrom: "2026-10-05", dateTo: "2026-10-05" }, 1, 10);
    expect(q.createdFrom).toBe(new Date(2026, 9, 5).toISOString());
    expect(q.createdBefore).toBe(new Date(2026, 9, 6).toISOString());
  });

  it("sends the author trimmed, and leaves out a blank one", () => {
    expect(tilFeedQuery({ ...none, author: "  Alex Sam " }, 1, 10).author).toBe("Alex Sam");
    expect(tilFeedQuery({ ...none, author: "  " }, 1, 10)).not.toHaveProperty("author");
    expect(tilFeedQuery(none, 1, 10)).not.toHaveProperty("author");
  });

  it("sends the source only when one is chosen", () => {
    expect(tilFeedQuery({ ...none, source: "Partner" }, 1, 10).source).toBe("Partner");
    expect(tilFeedQuery({ ...none, source: "" }, 1, 10)).not.toHaveProperty("source");
  });

  it("asks for only the reader's own entries on My articles", () => {
    expect(tilFeedQuery({ ...none, mine: true }, 1, 10).mine).toBe(true);
    expect(tilFeedQuery(none, 1, 10)).not.toHaveProperty("mine");
  });
});
