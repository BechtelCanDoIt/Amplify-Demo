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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIBRARY_STORAGE_EVENT,
  MAX_RECENT_SEARCHES,
  addRecent,
  clearRecent,
  hasSeenIntro,
  markIntroSeen,
  parseRecent,
  readRecentRaw,
} from "./libraryStorage";

const recent = (user: string): string[] => parseRecent(readRecentRaw(user));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recent searches", () => {
  it("lists the newest first", () => {
    addRecent("u1", "pricing");
    addRecent("u1", "security");
    expect(recent("u1")).toEqual(["security", "pricing"]);
  });

  it("moves a repeated search to the top instead of listing it twice, whatever its case", () => {
    addRecent("u1", "pricing");
    addRecent("u1", "security");
    addRecent("u1", "  PRICING ");
    expect(recent("u1")).toEqual(["PRICING", "security"]);
  });

  it("keeps only the latest few", () => {
    for (let i = 0; i < MAX_RECENT_SEARCHES + 3; i += 1) addRecent("u1", `question ${i}`);
    const list = recent("u1");
    expect(list).toHaveLength(MAX_RECENT_SEARCHES);
    expect(list[0]).toBe(`question ${MAX_RECENT_SEARCHES + 2}`);
  });

  it("ignores a blank search", () => {
    addRecent("u1", "   ");
    expect(recent("u1")).toEqual([]);
  });

  it("keeps each person's searches to themselves", () => {
    addRecent("u1", "pricing");
    addRecent("u2", "security");
    expect(recent("u1")).toEqual(["pricing"]);
    expect(recent("u2")).toEqual(["security"]);
  });

  it("clears one person's searches only", () => {
    addRecent("u1", "pricing");
    addRecent("u2", "security");
    clearRecent("u1");
    expect(recent("u1")).toEqual([]);
    expect(recent("u2")).toEqual(["security"]);
  });

  it("tells the page when something changed", () => {
    const listener = vi.fn();
    window.addEventListener(LIBRARY_STORAGE_EVENT, listener);
    addRecent("u1", "pricing");
    clearRecent("u1");
    window.removeEventListener(LIBRARY_STORAGE_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("parseRecent", () => {
  it("reads a list of searches", () => {
    expect(parseRecent('["a","b"]')).toEqual(["a", "b"]);
  });

  it("treats anything else as no searches", () => {
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent("null")).toEqual([]);
  });

  it("drops entries that aren't text, and blank ones", () => {
    expect(parseRecent('["a",1,null,"  ","b"]')).toEqual(["a", "b"]);
  });
});

describe("the welcome card", () => {
  it("shows until it has been dismissed once", () => {
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });
});

describe("when the browser refuses storage", () => {
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };

  it("never throws, and shows nothing stored", () => {
    vi.stubGlobal("localStorage", broken);
    expect(readRecentRaw("u1")).toBe("[]");
    expect(() => addRecent("u1", "pricing")).not.toThrow();
    expect(() => clearRecent("u1")).not.toThrow();
    expect(() => markIntroSeen()).not.toThrow();
  });

  it("hides the welcome card rather than showing it on every visit", () => {
    vi.stubGlobal("localStorage", broken);
    expect(hasSeenIntro()).toBe(true);
  });
});
