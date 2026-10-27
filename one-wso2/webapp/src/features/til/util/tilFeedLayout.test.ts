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
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TIL_FEED_LAYOUT,
  DEFAULT_TIL_FEED_PAGE_SIZE,
  TIL_FEED_PAGE_SIZES,
  pageContaining,
  readTilFeedLayout,
  readTilFeedPageSize,
  writeTilFeedLayout,
  writeTilFeedPageSize,
} from "./tilFeedLayout";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("readTilFeedLayout / writeTilFeedLayout", () => {
  it("opens in Cards until a layout is chosen", () => {
    expect(DEFAULT_TIL_FEED_LAYOUT).toBe("cards");
    expect(readTilFeedLayout()).toBe("cards");
  });

  it("remembers the chosen layout", () => {
    writeTilFeedLayout("large");
    expect(readTilFeedLayout()).toBe("large");
  });

  it("ignores a stored value that isn't a layout", () => {
    localStorage.setItem("one-wso2.til.feed-layout", "magazine");
    expect(readTilFeedLayout()).toBe("cards");
  });

  it("falls back to the default when storage is blocked", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeTilFeedLayout("list")).not.toThrow();
    expect(readTilFeedLayout()).toBe("cards");
  });
});

describe("readTilFeedPageSize / writeTilFeedPageSize", () => {
  it("offers 5 or 10, and shows 10 until one is chosen", () => {
    expect(TIL_FEED_PAGE_SIZES).toEqual([5, 10]);
    expect(DEFAULT_TIL_FEED_PAGE_SIZE).toBe(10);
    expect(readTilFeedPageSize()).toBe(10);
  });

  it("remembers the chosen size", () => {
    writeTilFeedPageSize(5);
    expect(readTilFeedPageSize()).toBe(5);
  });

  it("ignores a stored value that isn't one of the sizes", () => {
    localStorage.setItem("one-wso2.til.feed-page-size", "25");
    expect(readTilFeedPageSize()).toBe(10);
    localStorage.setItem("one-wso2.til.feed-page-size", "ten");
    expect(readTilFeedPageSize()).toBe(10);
  });

  it("falls back to the default when storage is blocked", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => writeTilFeedPageSize(5)).not.toThrow();
    expect(readTilFeedPageSize()).toBe(10);
  });
});

describe("pageContaining", () => {
  it("keeps the first entry on screen when pages grow", () => {
    // Page 3 of 5 starts at entry 10; pages of 10 hold it on page 2.
    expect(pageContaining(10, 10)).toBe(2);
    expect(pageContaining(5, 10)).toBe(1);
  });

  it("keeps the first entry on screen when pages shrink", () => {
    // Page 2 of 10 starts at entry 10; pages of 5 hold it on page 3.
    expect(pageContaining(10, 5)).toBe(3);
  });

  it("starts at page one", () => {
    expect(pageContaining(0, 12)).toBe(1);
    expect(pageContaining(-1, 12)).toBe(1);
  });
});
