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

const http = vi.hoisted(() => ({ authedGet: vi.fn(), authedPost: vi.fn() }));
const config = vi.hoisted(() => ({ library: true }));
vi.mock("@api/http", async (importOriginal) => ({ ...(await importOriginal<typeof import("@api/http")>()), ...http }));
vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isSmartSearchBackendConfigured: () => config.library,
  smartSearchServiceUrls: { search: (q: string, a: boolean) => `/lib/smart-search?q=${q}&a=${a}` },
  echoServiceUrls: { ask: (id: string) => `/echo/deals/${id}/ask` },
}));

import { askDeal, LIBRARY_WAIT_MS, libraryQuery, searchLibrary } from "./askAi";

const passage = (n: number) => ({
  content: `text ${n}`, title: `Doc ${n}`, page: n, similarityScore: 0.9, documentId: String(n), unitLabel: "Slide",
  fileExtension: "pptx", source: "drive", driveLink: `https://drive/${n}`, nativeLink: n % 2 ? `https://drive/${n}#slide` : "",
});

afterEach(() => {
  http.authedGet.mockReset();
  http.authedPost.mockReset();
  config.library = true;
  vi.useRealTimers();
});

describe("libraryQuery", () => {
  it("puts the current question first, then the earlier ones newest first, six at most", () => {
    expect(libraryQuery("Q7", ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"])).toBe("Q7 | Q6 | Q5 | Q4 | Q3 | Q2");
    expect(libraryQuery("  Does it run on-prem? ", [])).toBe("Does it run on-prem?");
  });

  it("is trimmed to 1000 characters", () => {
    expect(libraryQuery("a".repeat(900), ["b".repeat(900)])).toHaveLength(1000);
  });
});

describe("searchLibrary", () => {
  it("asks for passages only, as the user, and keeps the top six", async () => {
    http.authedGet.mockResolvedValue({ answer: null, sources: [1, 2, 3, 4, 5, 6, 7, 8].map(passage), contents: [] });
    const found = await searchLibrary("Q", "token");
    expect(http.authedGet).toHaveBeenCalledWith("/lib/smart-search?q=Q&a=false", "token");
    expect(found).toHaveLength(6);
    expect(found?.[0]).toEqual({ title: "Doc 1", content: "text 1", link: "https://drive/1#slide", page: 1, unitLabel: "Slide", documentId: "1" });
    // The Drive link when there is no deep link.
    expect(found?.[1].link).toBe("https://drive/2");
  });

  it("is null when the Library is not set up, fails, or is slower than 30 seconds", async () => {
    config.library = false;
    expect(await searchLibrary("Q", "t")).toBeNull();
    expect(http.authedGet).not.toHaveBeenCalled();

    config.library = true;
    http.authedGet.mockRejectedValueOnce(new Error("down"));
    expect(await searchLibrary("Q", "t")).toBeNull();

    vi.useFakeTimers();
    http.authedGet.mockReturnValueOnce(new Promise(() => {}));
    const slow = searchLibrary("Q", "t");
    await vi.advanceTimersByTimeAsync(LIBRARY_WAIT_MS);
    expect(await slow).toBeNull();
  });
});

describe("askDeal", () => {
  it("posts the question to the opportunity's ask route", async () => {
    const answer = { answer: "x", covered: false, nextQuestion: null, sources: [], libraryUnavailable: false };
    http.authedPost.mockResolvedValue(answer);
    const req = { question: "Q", history: [], librarySources: [], libraryUnavailable: false };
    expect(await askDeal("006A", req, "token")).toBe(answer);
    expect(http.authedPost).toHaveBeenCalledWith("/echo/deals/006A/ask", "token", req);
  });
});
