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
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { HttpError } from "@api/http";
import { RequestTimeoutError } from "../util/libraryFailure";
import type { SmartSearchResponse } from "../api/smartSearchTypes";
import {
  ANSWER_RESPONSE,
  ANSWER_TEXT,
  DECK_SOURCE,
  PROSPECTUS_SOURCE,
  SOURCES_RESPONSE,
  TEST_NOW,
  TEST_PDF_SOURCE,
} from "../testing/fixtures";

// The data hooks, storage and the shell's pin and notification hooks are replaced with stand-ins the
// tests control. They pull Asgardeo into the module graph, and that package does not resolve under
// vitest's ESM loader.
const mocks = vi.hoisted(() => {
  const refetch = vi.fn();
  return {
    refetch,
    togglePin: vi.fn(),
    showWarning: vi.fn(),
    showSuccess: vi.fn(),
    recentAdd: vi.fn(),
    recentClear: vi.fn(),
    introDismiss: vi.fn(),
    composeMutate: vi.fn(),
    composeReset: vi.fn(),
    // What the compose hook returns, in a store so that a change reaches the card the way a real mutation's would.
    compose: {
      value: {} as Record<string, unknown>,
      listeners: new Set<() => void>(),
    },
    state: {
      configured: true,
      sources: {} as Record<string, unknown>,
      answer: {} as Record<string, unknown>,
      pinned: [] as { kind: string; id: string; label: string; href: string }[],
      recent: [] as string[],
      showIntro: false,
    },
  };
});

vi.mock("@config/apiConfig", () => ({ isSmartSearchBackendConfigured: () => mocks.state.configured }));
vi.mock("../api/useSmartSearch", () => ({
  useSmartSearchSources: () => mocks.state.sources,
  useSmartSearchAnswer: () => mocks.state.answer,
}));
vi.mock("../api/useComposeMessage", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (listener: () => void) => {
    mocks.compose.listeners.add(listener);
    return () => mocks.compose.listeners.delete(listener);
  };
  return {
    useComposeMessage: () => ({
      ...useSyncExternalStore(subscribe, () => mocks.compose.value),
      mutate: mocks.composeMutate,
      reset: mocks.composeReset,
    }),
  };
});
vi.mock("@features/pinned/usePinned", () => ({
  usePinnedEntries: () => mocks.state.pinned,
  useTogglePin: () => mocks.togglePin,
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showWarning: mocks.showWarning, showError: vi.fn(), showSuccess: mocks.showSuccess }),
}));
vi.mock("../util/useLibraryStorage", () => ({
  useRecentSearches: () => ({ items: mocks.state.recent, add: mocks.recentAdd, clear: mocks.recentClear }),
  useIntroCard: () => ({ show: mocks.state.showIntro, dismiss: mocks.introDismiss }),
}));

import { resetRefreshForTests } from "../util/libraryReload";
import LibraryPage from "./LibraryPage";

const query = (overrides: Record<string, unknown>) => ({
  data: undefined,
  isPending: false,
  isLoading: false,
  isError: false,
  isSuccess: false,
  isFetching: false,
  error: null,
  refetch: mocks.refetch,
  ...overrides,
});
const loading = () => query({ isPending: true, isLoading: true, isFetching: true });
const success = (data: SmartSearchResponse) => query({ data, isSuccess: true });
const failure = (error: unknown) => query({ isError: true, error });

function setCompose(value: Record<string, unknown>) {
  mocks.compose.value = { data: undefined, isPending: false, isError: false, error: null, ...value };
  act(() => mocks.compose.listeners.forEach((listener) => listener()));
}

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LibraryPage />
      <Where />
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId("where").textContent;
const RESULTS_PATH = "/sales/library?q=wso2con";

function setupClipboard() {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  return { user, writeText };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_NOW);
  mocks.refetch.mockReset();
  mocks.togglePin.mockReset().mockReturnValue("pinned");
  mocks.showWarning.mockReset();
  mocks.recentAdd.mockReset();
  mocks.recentClear.mockReset();
  mocks.introDismiss.mockReset();
  mocks.composeMutate.mockReset();
  mocks.composeReset.mockReset();
  mocks.compose.value = { data: undefined, isPending: false, isError: false, error: null };
  mocks.state.configured = true;
  mocks.state.sources = success(SOURCES_RESPONSE);
  mocks.state.answer = success(ANSWER_RESPONSE);
  mocks.state.pinned = [];
  mocks.state.recent = [];
  mocks.state.showIntro = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("when the backend is not set", () => {
  it("names the config key and shows no search box", () => {
    mocks.state.configured = false;
    renderAt("/sales/library");
    expect(screen.getByRole("heading", { name: "Ask Sales" })).toBeInTheDocument();
    expect(screen.getByText("ONE_WSO2_SMART_SEARCH_BACKEND_URL")).toBeInTheDocument();
    expect(screen.getByText(/isn.t connected yet/)).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("shows the notice even when the address carries a question", () => {
    mocks.state.configured = false;
    renderAt(RESULTS_PATH);
    expect(screen.getByText("ONE_WSO2_SMART_SEARCH_BACKEND_URL")).toBeInTheDocument();
  });
});

describe("the start screen", () => {
  it("offers the search box, the privacy line and five topics", () => {
    renderAt("/sales/library");
    expect(screen.getByRole("heading", { name: "Ask Sales" })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText(/Searches Pitstop content only/)).toBeInTheDocument();
    for (const topic of ["Security", "Pricing", "Competitors", "Demos", "Onboarding"]) {
      expect(screen.getByText(topic)).toBeInTheDocument();
    }
  });

  it("searches only once there is something to search for", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "   ");
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "pricing, discounts");
    expect(button).toBeEnabled();
  });

  it("offers a clear button only while there is something typed, and empties the box on the start screen", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    const box = screen.getByRole("textbox", { name: "Ask a question" });
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    await user.type(box, "pricing");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(box).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    expect(where()).toBe("/sales/library");
    expect(mocks.recentAdd).not.toHaveBeenCalled();
  });

  it("puts the question in the address and remembers it", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "  pricing, discounts & terms?{Enter}");
    expect(where()).toBe("/sales/library?q=pricing%2C%20discounts%20%26%20terms%3F");
    expect(mocks.recentAdd).toHaveBeenCalledWith("pricing, discounts & terms?");
  });

  it("starts a search from a topic", async () => {
    const user = userEvent.setup();
    renderAt("/sales/library");
    await user.click(screen.getByText("Security"));
    expect(where()).toBe("/sales/library?q=How%20do%20we%20answer%20a%20security%20questionnaire%3F");
    expect(mocks.recentAdd).toHaveBeenCalledWith("How do we answer a security questionnaire?");
  });

  it("treats a blank question in the address as no question", () => {
    renderAt("/sales/library?q=%20%20");
    expect(screen.getByText("Start with a topic")).toBeInTheDocument();
  });

  it("lists recent searches and runs one on a click", async () => {
    const user = userEvent.setup();
    mocks.state.recent = ["pricing one-pager", "battlecards"];
    renderAt("/sales/library");
    expect(screen.getByText("pricing one-pager")).toBeInTheDocument();
    await user.click(screen.getByText("battlecards"));
    expect(where()).toBe("/sales/library?q=battlecards");
    expect(mocks.recentAdd).toHaveBeenCalledWith("battlecards");
  });

  it("clears the recent searches", async () => {
    const user = userEvent.setup();
    mocks.state.recent = ["pricing one-pager"];
    renderAt("/sales/library");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(mocks.recentClear).toHaveBeenCalled();
  });

  it("says so when there are no recent searches, and offers no Clear", () => {
    renderAt("/sales/library");
    expect(screen.getByText("Your recent searches show up here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.getByText(/Recent searches are kept in this browser only/)).toBeInTheDocument();
  });

  it("lists pinned Ask Sales searches only, and opens one", async () => {
    const user = userEvent.setup();
    mocks.state.pinned = [
      { kind: "search", id: "/sales/library?q=pricing", label: "Ask Sales: pricing", href: "/sales/library?q=pricing" },
      { kind: "search", id: "/sales?x=1", label: "Meetings filter", href: "/sales?x=1" },
      { kind: "page", id: "/sales/library", label: "Ask Sales", href: "/sales/library" },
    ];
    renderAt("/sales/library");
    expect(screen.queryByText("Meetings filter")).not.toBeInTheDocument();
    await user.click(screen.getByText("Ask Sales: pricing"));
    expect(where()).toBe("/sales/library?q=pricing");
  });

  it("explains pinning when nothing is pinned", () => {
    renderAt("/sales/library");
    expect(screen.getByText(/Pin a search from its results/)).toBeInTheDocument();
  });

  it("shows the welcome card once, and dismisses it", async () => {
    const user = userEvent.setup();
    mocks.state.showIntro = true;
    renderAt("/sales/library");
    expect(screen.getByText("New in Sales: Ask Sales")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(mocks.introDismiss).toHaveBeenCalled();
  });

  it("shows no welcome card once it has been seen", () => {
    renderAt("/sales/library");
    expect(screen.queryByText("New in Sales: Ask Sales")).not.toBeInTheDocument();
  });
});

describe("the results", () => {
  it("shows the matching documents and the answer, and does not list the sources again under the answer", () => {
    renderAt(RESULTS_PATH);
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
    const answer = screen.getByRole("region", { name: "AI-generated answer" });
    expect(within(answer).getByText(ANSWER_TEXT)).toBeInTheDocument();
    expect(within(answer).queryByRole("button", { name: /^\d · / })).not.toBeInTheDocument();
    expect(within(answer).queryByText(/WSO2Con NA 2026/)).not.toBeInTheDocument();
  });

  it("is titled Ask Sales, never Library", () => {
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("heading", { level: 1, name: "Ask Sales" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Library" })).not.toBeInTheDocument();
  });

  it("puts the sources first, then the preview and the written answer beside them", () => {
    renderAt(RESULTS_PATH);
    const sources = screen.getByRole("region", { name: "Sources" });
    const preview = screen.getByLabelText("Preview");
    const answer = screen.getByRole("region", { name: "AI-generated answer" });
    const before = (a: HTMLElement, b: HTMLElement) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(sources, preview)).toBe(true);
    expect(before(preview, answer)).toBe(true);
    expect(within(sources).getAllByTestId("library-result")).toHaveLength(5);
    expect(within(sources).queryByRole("region", { name: "AI-generated answer" })).not.toBeInTheDocument();
  });

  it("marks the words of the question in each passage", () => {
    const { container } = renderAt(RESULTS_PATH);
    const marked = [...container.querySelectorAll("mark")].map((mark) => mark.textContent?.toLowerCase());
    expect(marked.length).toBeGreaterThan(0);
    expect(new Set(marked)).toEqual(new Set(["wso2con"]));
  });

  it("says how well each matches, and flags an old item", () => {
    renderAt(RESULTS_PATH);
    const cards = screen.getAllByTestId("library-result");
    expect(within(cards[0]!).getByText("Good match")).toBeInTheDocument();
    expect(within(cards[0]!).getByText("Added Oct 2026")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("Added Oct 2024 - check it is still current")).toBeInTheDocument();
  });

  it("calls a close match a strong one", () => {
    const [first, ...rest] = SOURCES_RESPONSE.sources;
    mocks.state.sources = success({ ...SOURCES_RESPONSE, sources: [{ ...first!, similarityScore: 0.82 }, ...rest] });
    renderAt(RESULTS_PATH);
    expect(within(screen.getAllByTestId("library-result")[0]!).getByText("Strong match")).toBeInTheDocument();
  });

  it("shows each document's tags, and skips the empty ones", () => {
    renderAt(RESULTS_PATH);
    const cards = screen.getAllByTestId("library-result");
    expect(within(cards[1]!).getByText("wso2con2025")).toBeInTheDocument();
    expect(within(cards[0]!).getAllByText(/.+/).some((node) => node.textContent === "")).toBe(false);
  });

  it("says when the written answer is taking longer than usual, while the documents are already there", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    mocks.state.answer = query({ isPending: true, isLoading: true });
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/Writing your answer/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(16_000);
    });
    expect(screen.getByText(/This is taking longer than usual - the service may be busy/)).toBeInTheDocument();
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it("shows the documents while the answer is still being written", () => {
    mocks.state.answer = query({ isPending: true, isLoading: true });
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("status", { name: "Writing an answer" })).toBeInTheDocument();
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Copy answer" })).not.toBeInTheDocument();
  });

  it("says so when no answer could be written, and still offers to write from the sources", () => {
    mocks.state.answer = success({ ...SOURCES_RESPONSE, answer: null });
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/No written answer for this search/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy answer" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Use these sources" })).toBeInTheDocument();
  });

  it("does not show an answer that was written from different documents", () => {
    mocks.state.answer = success({ ...ANSWER_RESPONSE, sources: [DECK_SOURCE, PROSPECTUS_SOURCE] });
    renderAt(RESULTS_PATH);
    expect(screen.queryByText(ANSWER_TEXT)).not.toBeInTheDocument();
    expect(screen.getByText(/No written answer for this search/)).toBeInTheDocument();
  });

  it("explains a rate-limited answer", () => {
    mocks.state.answer = failure(new HttpError("https://x/smart-search", 429, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/written answer is paused/)).toBeInTheDocument();
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it.each([
    [new HttpError("https://x/smart-search", 500, ""), /The written answer isn.t available right now\. The documents still match\./],
    [new HttpError("https://x/smart-search", 503, ""), /The written answer isn.t available right now\. The documents still match\./],
    [new HttpError("https://x/smart-search", 504, ""), /The written answer took too long, so we stopped waiting\. The documents still match\./],
    [new TypeError("Failed to fetch"), /We couldn.t reach the server\. Check your connection, then try again in a moment\. The documents still match\./],
  ])("says plainly why there is no answer when it fails, and keeps the documents", (error, message) => {
    mocks.state.answer = failure(error);
    renderAt(RESULTS_PATH);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch|HTTP 5/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it("shows the answer as plain text, never as markup", () => {
    mocks.state.answer = success({ ...ANSWER_RESPONSE, answer: "Use <b>bold</b> and <img src=x onerror=alert(1)>" });
    const { container } = renderAt(RESULTS_PATH);
    expect(screen.getByText("Use <b>bold</b> and <img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });
});

describe("filtering by type", () => {
  it("lists the types that are there, and narrows to one", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    for (const label of [/^All$/, /^Documents · \d+$/, /^Decks · \d+$/, /^PDFs · 2$/, /^Web pages · \d+$/]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /^Videos/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^PDFs/ }));
    expect(screen.getAllByTestId("library-result")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^PDFs/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it("numbers the sources again after filtering", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: /^Decks/ }));
    const cards = screen.getAllByTestId("library-result");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]!).getByText("WSO2Con 2025 - Regional Presentation")).toBeInTheDocument();
    expect(within(cards[0]!).getByText("1")).toBeInTheDocument();
  });

  it("offers no filter when every result is the same type", () => {
    mocks.state.sources = success({
      ...SOURCES_RESPONSE,
      sources: [TEST_PDF_SOURCE, PROSPECTUS_SOURCE],
    });
    mocks.state.answer = success({ ...SOURCES_RESPONSE, sources: [TEST_PDF_SOURCE, PROSPECTUS_SOURCE], answer: "A." });
    renderAt(RESULTS_PATH);
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
  });
});

describe("the preview", () => {
  it("starts with the first result, and says a PDF opens whole in a new tab", () => {
    renderAt(RESULTS_PATH);
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("TEST")).toBeInTheDocument();
    expect(within(preview).getByText(/The match is on Page 9\. Google Drive opens the whole PDF in a new tab\./)).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "Open" })).toHaveAttribute("href", TEST_PDF_SOURCE.driveLink);
  });

  it("frames a Google deck at its slide when it is picked, and opens it at that slide", async () => {
    const user = userEvent.setup();
    const { container } = renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Preview WSO2Con 2025 - Regional Presentation" }));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("src")).toBe(
      "https://docs.google.com/presentation/d/1jnIhpsBA00e4EJ8BIvaIkD1MwvDHOx-XPommKUo9Fe4/embed?slide=id.g2f820b48fab_0_28",
    );
    expect(frame?.getAttribute("title")).toBe("Preview of WSO2Con 2025 - Regional Presentation");
    expect(frame?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame?.getAttribute("sandbox")).not.toContain("allow-top-navigation");
    const open = screen.getByRole("link", { name: "Open at Slide 5" });
    expect(open).toHaveAttribute("href", DECK_SOURCE.nativeLink);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("frames nothing for a Drive PDF", () => {
    const { container } = renderAt(RESULTS_PATH);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("previews the result that is picked from the list", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: /^Preview Convince Your Boss/ }));
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("Convince Your Boss - Landing Page")).toBeInTheDocument();
    expect(within(preview).getByText(/scrolls to the matching text/)).toBeInTheDocument();
  });

  it("opens a passage from its own link, in a new tab", () => {
    renderAt(RESULTS_PATH);
    const link = screen.getByRole("link", { name: "Open WSO2Con 2025 - Regional Presentation at Slide 5 in a new tab" });
    expect(link).toHaveAttribute("href", DECK_SOURCE.nativeLink);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("copying the answer", () => {
  it("copies the answer's text, says so, and shows the plain text of it", async () => {
    const { user, writeText } = setupClipboard();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Copy answer" }));
    expect(writeText).toHaveBeenCalledWith(ANSWER_TEXT);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("says so when the browser refuses to copy", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Copy answer" }));
    expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringMatching(/Couldn.t copy/));
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });
});

describe("writing from the sources", () => {
  // Every result's Pitstop id, best match first: the message is written from all of them.
  const ALL_IDS = [...new Set(SOURCES_RESPONSE.sources.map((source) => source.documentId))];
  const card = () => screen.getByRole("region", { name: "Use these sources" });
  const done = (text: string, documentIds: string[] = ALL_IDS, subject?: string) =>
    setCompose({ data: { text, documentIds, subject } });
  const ask = (intent: string, extra: Record<string, unknown> = {}) => ({
    query: "wso2con",
    documentIds: ALL_IDS,
    intent,
    ...extra,
  });

  afterEach(() => vi.unstubAllGlobals());

  // One paste rather than a key press for each letter: typing a sentence into a text area is slow enough to time out on a busy machine.
  const fillIn = async (user: ReturnType<typeof userEvent.setup>, field: HTMLElement, text: string) => {
    await user.click(field);
    await user.paste(text);
  };

  it("offers five things to write from the results, and writes nothing yet", () => {
    renderAt(RESULTS_PATH);
    for (const name of [
      /Email a customer/,
      /Send a chat message/,
      /Plain summary/,
      /Understand these/,
      /Something else/,
    ]) {
      expect(within(card()).getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
    expect(mocks.composeMutate).not.toHaveBeenCalled();
    expect(within(card()).queryByLabelText("The written message")).not.toBeInTheDocument();
  });

  it("sits under the preview and above the written answer", () => {
    renderAt(RESULTS_PATH);
    const preview = screen.getByLabelText("Preview");
    const answer = screen.getByRole("region", { name: "AI-generated answer" });
    const follows = (a: HTMLElement, b: HTMLElement) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(preview, card())).toBe(true);
    expect(follows(card(), answer)).toBe(true);
  });

  it.each([
    ["chat", /Send a chat message/],
    ["plain", /Plain summary/],
    ["explain", /Understand these/],
  ])("writes a %s straight away from every result, with no questions", async (intent, name) => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name }));
    expect(mocks.composeReset).toHaveBeenCalled();
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask(intent));
    expect(within(card()).queryByLabelText("Customer's name")).not.toBeInTheDocument();
  });

  it("writes from all the results, whichever one is selected", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: /^Preview WSO2Con 2025 - Regional Presentation/ }));
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("plain"));
    expect(ALL_IDS.length).toBeGreaterThan(1);
  });

  it("writes only from the results of the type that is picked", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: /^Decks/ }));
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    expect(mocks.composeMutate).toHaveBeenCalledWith({ ...ask("plain"), documentIds: [DECK_SOURCE.documentId] });
  });

  it("writes from the best ten when there are more, and skips a result with no Pitstop id", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 13 }, (_, index) => ({
      ...DECK_SOURCE,
      documentId: index === 1 ? "" : `d${index}`,
      title: `Deck ${index}`,
      driveLink: `https://docs.google.com/presentation/d/id${index}/edit`,
    }));
    mocks.state.sources = success({ ...SOURCES_RESPONSE, sources: many, contents: [] });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(
      ask("plain", { documentIds: ["d0", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10"] }),
    );
  });

  it("lets the seller say what they need it for, and writes only once they have", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    expect(mocks.composeMutate).not.toHaveBeenCalled();
    const box = within(card()).getByLabelText("What do you need it for?");
    const write = within(card()).getByRole("button", { name: "Write it" });
    expect(write).toBeDisabled();
    await fillIn(user, box, "   ");
    expect(write).toBeDisabled();
    await fillIn(user, box, "A short note for the security team  ");
    expect(write).toBeEnabled();
    await user.click(write);
    expect(mocks.composeMutate).toHaveBeenCalledTimes(1);
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("custom", { purpose: "A short note for the security team" }));
  });

  it("writes from the box with Ctrl+Enter, and not while it is empty", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    const box = within(card()).getByLabelText("What do you need it for?");
    await user.click(box);
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(mocks.composeMutate).not.toHaveBeenCalled();
    await fillIn(user, box, "A note for the CTO");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(mocks.composeMutate).toHaveBeenCalledWith(expect.objectContaining({ intent: "custom", purpose: "A note for the CTO" }));
  });

  it("stops the box at the longest the backend takes", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    expect(within(card()).getByLabelText("What do you need it for?")).toHaveAttribute("maxlength", "500");
  });

  it("shows what was written for them with where it came from, and writes it again on request", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    await fillIn(user, within(card()).getByLabelText("What do you need it for?"), "A note for the CTO");
    done("It covers the security controls.");
    const text = within(card()).getByLabelText("The written message").textContent ?? "";
    expect(text.startsWith("It covers the security controls.\n\nSources:\n1. TEST (Page 9) - https://drive.google.com/")).toBe(true);
    expect(text).toContain("2. WSO2Con 2025 - Regional Presentation (Slide 5) - https://docs.google.com/presentation/");
    expect(within(card()).queryByLabelText("Customer's name")).not.toBeInTheDocument();
    expect(within(card()).getAllByRole("button", { name: "Write it again" })).toHaveLength(1);
    mocks.composeMutate.mockClear();
    await user.click(within(card()).getByRole("button", { name: "Write it again" }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(expect.objectContaining({ intent: "custom", purpose: "A note for the CTO" }));
  });

  it("starts something else with an empty box each time it is picked", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    await fillIn(user, within(card()).getByLabelText("What do you need it for?"), "A speech about the event");
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    expect(within(card()).getByLabelText("What do you need it for?")).toHaveValue("");
    expect(within(card()).getByRole("button", { name: "Write it" })).toBeDisabled();
  });

  it("forgets the customer's name when another kind is picked, but keeps the seller's own", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    await fillIn(user, within(card()).getByLabelText("Customer's name"), "Alex");
    await fillIn(user, within(card()).getByLabelText("Your name"), "Sam");
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    expect(within(card()).getByLabelText("Customer's name")).toHaveValue("");
    expect(within(card()).getByLabelText("Your name")).toHaveValue("Sam");
  });

  it("leaves the shortcuts alone while something is being typed in the box for something else", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    const box = within(card()).getByLabelText("What do you need it for?");
    await user.click(box);
    await user.keyboard("a/b{ArrowDown}{ArrowUp}{Enter}c");
    expect(box).toHaveFocus();
    expect(box).toHaveValue("a/b\nc");
    expect(screen.getByRole("button", { name: /^Preview TEST/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(card()).getByRole("button", { name: "Write it" })).toBeEnabled();
  });

  it("leaves the shortcuts alone while a name is being typed", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    const box = within(card()).getByLabelText("Customer's name");
    await user.click(box);
    await user.keyboard("A/l{ArrowDown}ex");
    expect(box).toHaveFocus();
    expect(box).toHaveValue("A/lex");
  });

  it("offers one way to try again after an email or a request of one's own fails, not two", async () => {
    const user = userEvent.setup();
    setCompose({ isError: true, error: new Error("boom") });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    expect(within(card()).getByText(/Couldn.t write that just now/)).toBeInTheDocument();
    expect(within(card()).getByRole("button", { name: "Write the email" })).toBeInTheDocument();
    expect(within(card()).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    await fillIn(user, within(card()).getByLabelText("What do you need it for?"), "A note");
    expect(within(card()).getByRole("button", { name: "Write it" })).toBeEnabled();
    expect(within(card()).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("never sends what was typed for something else with any other kind of message", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    await fillIn(user, within(card()).getByLabelText("What do you need it for?"), "A note for the CTO");
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("plain"));
  });

  it("asks for the names first when it is an email, and writes only when told to", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    expect(within(card()).getByLabelText("Customer's name")).toBeInTheDocument();
    expect(within(card()).getByLabelText("Your name")).toBeInTheDocument();
    expect(mocks.composeMutate).not.toHaveBeenCalled();
    await user.click(within(card()).getByRole("button", { name: "Write the email" }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("email"));
  });

  it("lets the questions be skipped, and forgets any names already typed", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    await fillIn(user, within(card()).getByLabelText("Customer's name"), "Alex");
    await user.click(within(card()).getByRole("button", { name: "Write it without names" }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("email"));
    expect(within(card()).getByLabelText("Customer's name")).toHaveValue("");
  });

  it("puts the names and a link to every source into the written email, and keeps the text up to date as the names change", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    done("These materials cover the pricing tiers.");
    const box = () => within(card()).getByLabelText("The written message").textContent ?? "";
    expect(box()).toContain("Hi [Name],");
    expect(box()).toContain("These materials cover the pricing tiers.");
    expect(box()).toContain("Best regards,\n[Your name]");
    expect(box()).toContain("Where to find them:\n1. TEST (Page 9)\nhttps://drive.google.com/file/d/");
    expect(box()).toContain("2. WSO2Con 2025 - Regional Presentation (Slide 5)");
    await fillIn(user, within(card()).getByLabelText("Customer's name"), "Alex");
    await fillIn(user, within(card()).getByLabelText("Your name"), "Sam");
    expect(box()).toContain("Hi Alex,");
    expect(box()).toContain("Best regards,\nSam");
  });

  it("uses the subject the AI wrote for an email, and the question when it wrote none", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    done("Body text.", ALL_IDS, "Everything on WSO2Con, in one place");
    const box = () => within(card()).getByLabelText("The written message").textContent ?? "";
    expect(box().startsWith("Subject: Everything on WSO2Con, in one place\n\nHi [Name],")).toBe(true);
    done("Body text.");
    expect(box().startsWith("Subject: Wso2con\n\nHi [Name],")).toBe(true);
  });

  it("lists only the sources the backend says it used", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    done("Worth a look.", [DECK_SOURCE.documentId]);
    const text = within(card()).getByLabelText("The written message").textContent ?? "";
    expect(text.startsWith("Worth a look.\n• WSO2Con 2025 - Regional Presentation (Slide 5) https://docs.google.com/")).toBe(true);
    expect(text).not.toContain("TEST");
    expect(within(card()).getByText(/Written by AI from these sources/)).toBeInTheDocument();
  });

  it("says when writing is taking longer than usual, and goes back when it is done", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    setCompose({ isPending: true });
    renderAt(RESULTS_PATH);
    expect(within(card()).getByText("Writing it…")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(13_000);
    });
    expect(within(card()).getByText(/taking longer than usual - the service may be busy/)).toBeInTheDocument();
    setCompose({ data: { text: "Done.", documentIds: ALL_IDS } });
    expect(within(card()).queryByText(/taking longer than usual/)).not.toBeInTheDocument();
    setCompose({ isPending: true });
    expect(within(card()).getByText("Writing it…")).toBeInTheDocument();
  });

  it("says it is writing while it waits", () => {
    setCompose({ isPending: true });
    renderAt(RESULTS_PATH);
    expect(within(card()).getByRole("status", { name: "Writing the message" })).toBeInTheDocument();
    for (const button of within(card()).getAllByRole("button")) {
      if (button.textContent === "Cancel") expect(button).toBeEnabled();
      else expect(button).toBeDisabled();
    }
  });

  it("lets the seller cancel a message that is taking too long, and pick again", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    expect(mocks.composeMutate).toHaveBeenCalledTimes(1);
    setCompose({ isPending: true });
    mocks.composeReset.mockClear();
    await user.click(within(card()).getByRole("button", { name: "Cancel" }));
    expect(mocks.composeReset).toHaveBeenCalledTimes(1);
    setCompose({});
    expect(within(card()).queryByRole("status", { name: "Writing the message" })).not.toBeInTheDocument();
    for (const option of ["Email a customer", "Send a chat message", "Plain summary", "Understand these", "Something else"]) {
      const button = within(card()).getByRole("button", { name: new RegExp(option) });
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
    // The same one can be picked again, and writes again.
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    expect(mocks.composeMutate).toHaveBeenCalledTimes(2);
  });

  it("keeps what was typed for an email or something else when the wait is cancelled", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Something else/ }));
    await fillIn(user, within(card()).getByLabelText("What do you need it for?"), "a short speech");
    await user.click(within(card()).getByRole("button", { name: /^Write it$/ }));
    setCompose({ isPending: true });
    await user.click(within(card()).getByRole("button", { name: "Cancel" }));
    setCompose({});
    expect(within(card()).getByLabelText("What do you need it for?")).toHaveValue("a short speech");
    expect(within(card()).getByRole("button", { name: /Something else/ })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    [new HttpError("/x", 429, ""), /Too many messages are being written right now\. Wait a minute/, "busy"],
    [new HttpError("/x", 404, ""), /aren.t in your search any more/, "missing"],
    [new HttpError("/x", 503, ""), /writing service isn.t responding right now/, "down"],
    [new HttpError("/x", 502, ""), /writing service isn.t responding right now/, "down"],
    [new HttpError("/x", 504, ""), /taking longer than usual, so we stopped waiting/, "slow"],
    [new RequestTimeoutError(), /taking longer than usual, so we stopped waiting/, "slow"],
    [new TypeError("Failed to fetch"), /couldn.t reach the server/, "unreachable"],
    [new HttpError("/x", 500, ""), /Couldn.t write that just now/, "other"],
    [new Error("boom"), /Couldn.t write that just now/, "other"],
  ])("explains a failure in plain words, and offers to try again (%#)", async (error, message) => {
    const user = userEvent.setup();
    setCompose({ isError: true, error });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    mocks.composeMutate.mockClear();
    expect(within(card()).getByText(message)).toBeInTheDocument();
    expect(within(card()).queryByText(/Failed to fetch|HTTP \d|boom/)).not.toBeInTheDocument();
    await user.click(within(card()).getByRole("button", { name: "Try again" }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("plain"));
  });

  it("says the sign-in has ended, with no try again that could not help", async () => {
    const user = userEvent.setup();
    setCompose({ isError: true, error: new HttpError("/x", 401, "") });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    expect(within(card()).getByText("Your sign-in has ended. Reload the page to sign in again.")).toBeInTheDocument();
    expect(within(card()).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("announces a failure to a screen reader", async () => {
    const user = userEvent.setup();
    setCompose({ isError: true, error: new HttpError("/x", 503, "") });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    expect(within(card()).getByRole("alert")).toHaveTextContent(/writing service isn.t responding/);
  });

  it("writes it again on request", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Understand these/ }));
    done("They cover pricing.");
    mocks.composeMutate.mockClear();
    await user.click(within(card()).getByRole("button", { name: "Write it again" }));
    expect(mocks.composeMutate).toHaveBeenCalledWith(ask("explain"));
  });

  it("copies the message, says so, and shows Copy again once the text changes", async () => {
    const { user, writeText } = setupClipboard();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    done("Body text.");
    const shown = within(card()).getByLabelText("The written message").textContent;
    await user.click(within(card()).getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(shown);
    expect(within(card()).getByRole("button", { name: "Copied" })).toBeInTheDocument();
    await fillIn(user, within(card()).getByLabelText("Your name"), "Sam");
    expect(within(card()).getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("copies an email as formatted text too, so the links are clickable when pasted", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText, write } });
    vi.stubGlobal("ClipboardItem", class { constructor(public items: Record<string, Blob>) {} });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Email a customer/ }));
    done("Body text.");
    await user.click(within(card()).getByRole("button", { name: "Copy" }));
    expect(write).toHaveBeenCalledTimes(1);
    const item = write.mock.calls[0]?.[0][0] as { items: Record<string, Blob> };
    expect(Object.keys(item.items).sort()).toEqual(["text/html", "text/plain"]);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies a chat message as plain text only", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText, write } });
    vi.stubGlobal("ClipboardItem", class { constructor(public items: Record<string, Blob>) {} });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    done("Worth a look.");
    await user.click(within(card()).getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
  });

  it("says so when the browser refuses to copy the message", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Plain summary/ }));
    done("Covers pricing.");
    await user.click(within(card()).getByRole("button", { name: "Copy" }));
    expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringMatching(/Couldn.t copy/));
  });

  it("starts over when the results change, for example with another type", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    expect(within(card()).getByRole("button", { name: /Send a chat message/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^Decks/ }));
    expect(within(card()).getByRole("button", { name: /Send a chat message/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps what was chosen while another result is previewed", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(within(card()).getByRole("button", { name: /Send a chat message/ }));
    await user.click(screen.getByRole("button", { name: /^Preview WSO2Con 2025 - Regional Presentation/ }));
    expect(within(card()).getByRole("button", { name: /Send a chat message/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("says a message can't be written when no result has a Pitstop id", () => {
    mocks.state.sources = success({
      ...SOURCES_RESPONSE,
      sources: SOURCES_RESPONSE.sources.map((source) => ({ ...source, documentId: "" })),
    });
    renderAt(RESULTS_PATH);
    expect(within(card()).getByText(/can.t be written for these results/)).toBeInTheDocument();
    expect(within(card()).queryByRole("button", { name: /Email a customer/ })).not.toBeInTheDocument();
  });
});

describe("pinning and sharing a search", () => {
  it("unpins a pinned search from the start screen", async () => {
    const user = userEvent.setup();
    const entry = { kind: "search", id: "/sales/library?q=wso2con", label: "Ask Sales: wso2con", href: "/sales/library?q=wso2con" };
    mocks.state.pinned = [entry];
    renderAt("/sales/library");
    await user.click(screen.getByRole("button", { name: "Unpin Ask Sales: wso2con" }));
    expect(mocks.togglePin).toHaveBeenCalledWith(entry);
  });

  it("pins the search with the question in the label and the address", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Pin search" }));
    expect(mocks.togglePin).toHaveBeenCalledWith({
      kind: "search",
      id: "/sales/library?q=wso2con",
      label: "Ask Sales: wso2con",
      href: "/sales/library?q=wso2con",
    });
  });

  it("shortens a long question in the label", async () => {
    const user = userEvent.setup();
    const long = "a".repeat(80);
    renderAt(`/sales/library?q=${long}`);
    await user.click(screen.getByRole("button", { name: "Pin search" }));
    const entry = mocks.togglePin.mock.calls[0]?.[0] as { label: string };
    expect(entry.label.length).toBeLessThanOrEqual("Ask Sales: ".length + 36);
    expect(entry.label.endsWith("…")).toBe(true);
  });

  it("shows the search as pinned once it is, and says when the pins are full", async () => {
    const user = userEvent.setup();
    mocks.state.pinned = [
      { kind: "search", id: "/sales/library?q=wso2con", label: "Ask Sales: wso2con", href: "/sales/library?q=wso2con" },
    ];
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");

    mocks.togglePin.mockReturnValue("at-capacity");
    await user.click(screen.getByRole("button", { name: "Pinned" }));
    expect(mocks.showWarning).toHaveBeenCalledWith(expect.stringMatching(/up to 8 pages/));
  });

  it("copies a link that rebuilds the same search", async () => {
    const { user, writeText } = setupClipboard();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/sales/library?q=wso2con`);
    expect(mocks.showSuccess).toHaveBeenCalledWith("Link copied.");
  });
});

describe("moving around", () => {
  it("goes back to the start screen", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "Back to Ask Sales" }));
    expect(where()).toBe("/sales/library");
  });

  it("runs a new question from the box on the results screen", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    const box = screen.getByRole("textbox", { name: "Ask a question" });
    expect(box).toHaveValue("wso2con");
    await user.clear(box);
    await user.type(box, "pricing{Enter}");
    expect(where()).toBe("/sales/library?q=pricing");
    expect(mocks.recentAdd).toHaveBeenCalledWith("pricing");
  });

  it("clears the box and goes back to the plain Ask Sales address", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("wso2con");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(where()).toBe("/sales/library");
    expect(screen.getByText("Start with a topic")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("");
  });

  it("cuts an over-long question in the address to the longest the box accepts", () => {
    renderAt(`/sales/library?q=${"b".repeat(400)}`);
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("b".repeat(300));
  });
});

describe("when the search does not give results", () => {
  it("shows the search as running while the documents load", () => {
    mocks.state.sources = loading();
    renderAt(RESULTS_PATH);
    expect(screen.getByRole("status", { name: "Searching" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("library-result")).toHaveLength(0);
  });

  it("says plainly when the caller isn't admitted to Pitstop", () => {
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 403, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/You don.t have access to Pitstop content, so Ask Sales can.t search for you/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("says to wait when the caller has searched too much", () => {
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 429, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText(/searched a lot in a short time/)).toBeInTheDocument();
  });

  it("offers a retry when the search itself failed", async () => {
    const user = userEvent.setup();
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 500, '{"message":"Error while searching."}'));
    renderAt(RESULTS_PATH);
    expect(screen.getByText("Couldn't run that search just now. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/Error while searching/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it.each([
    [new HttpError("https://x/smart-search", 503, ""), "Search isn't responding right now. Please try again in a few minutes."],
    [new HttpError("https://x/smart-search", 502, ""), "Search isn't responding right now. Please try again in a few minutes."],
    [
      new HttpError("https://x/smart-search", 504, ""),
      "The search is taking longer than usual, so we stopped waiting. Please try again in a moment.",
    ],
    [new TypeError("Failed to fetch"), "We couldn't reach the server. Check your connection, then try again in a moment."],
  ])("says in plain words when the search service is slow or can't be reached, and offers to try again", async (error, message) => {
    const user = userEvent.setup();
    mocks.state.sources = failure(error);
    renderAt(RESULTS_PATH);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch|HTTP \d/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("says so when the person is offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    mocks.state.sources = failure(new TypeError("Failed to fetch"));
    renderAt(RESULTS_PATH);
    expect(screen.getByText("You seem to be offline. Check your connection, then try again.")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("says the sign-in has ended, with no retry that could not help", () => {
    mocks.state.sources = failure(new HttpError("https://x/smart-search", 401, ""));
    renderAt(RESULTS_PATH);
    expect(screen.getByText("Your sign-in has ended. Reload the page to sign in again.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("says when the search is taking longer than usual", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    mocks.state.sources = loading();
    renderAt(RESULTS_PATH);
    expect(screen.getByText("Searching Pitstop…")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(11_000);
    });
    expect(screen.getByText("Searching Pitstop…")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByText(/Still searching - this is taking longer than usual/)).toBeInTheDocument();
  });

  it("says when nothing matched", () => {
    mocks.state.sources = success({ answer: null, sources: [], contents: [] });
    renderAt(RESULTS_PATH);
    expect(screen.getByText("No results found")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "AI-generated answer" })).not.toBeInTheDocument();
  });
});

describe("the touches that make it feel alive", () => {
  it("says which document is the top match, only when there is more than one to choose from", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    expect(screen.getAllByText("Top match")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /^Decks/ }));
    expect(screen.queryByText("Top match")).not.toBeInTheDocument();
  });

  it("says what it is doing while the documents are found and the answer is written", () => {
    mocks.state.sources = loading();
    const first = renderAt(RESULTS_PATH);
    expect(screen.getByText("Searching Pitstop…")).toBeInTheDocument();
    first.unmount();

    mocks.state.sources = success(SOURCES_RESPONSE);
    mocks.state.answer = query({ isPending: true, isLoading: true });
    renderAt(RESULTS_PATH);
    expect(screen.getByText("Found 5 documents. Writing your answer…")).toBeInTheDocument();
  });

  it("suggests where to start when nothing matched, and a suggestion runs as a search", async () => {
    const user = userEvent.setup();
    mocks.state.sources = success({ answer: null, sources: [], contents: [] });
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: "What is the latest pricing one-pager?" }));
    expect(where()).toBe("/sales/library?q=What%20is%20the%20latest%20pricing%20one-pager%3F");
  });

  it("moves through the results with the arrow keys and opens the one picked with Enter", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderAt(RESULTS_PATH);
    const decks = () => screen.getByRole("button", { name: /^Preview WSO2Con 2025 - Regional Presentation/ });
    expect(decks()).toHaveAttribute("aria-pressed", "false");
    await user.keyboard("{ArrowDown}");
    expect(decks()).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("docs.google.com/presentation"), "_blank", "noopener,noreferrer");
    await user.keyboard("{ArrowUp}");
    expect(decks()).toHaveAttribute("aria-pressed", "false");
    open.mockRestore();
  });

  it("opens the result picked with the arrow keys, even after a card was clicked", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("button", { name: /^Preview TEST/ }));
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(expect.stringContaining("docs.google.com/document"), "_blank", "noopener,noreferrer");
    open.mockRestore();
  });

  it("does not open anything when Enter is pressed on a button or a chip", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderAt(RESULTS_PATH);
    screen.getByRole("button", { name: /^Decks/ }).focus();
    await user.keyboard("{Enter}");
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("leaves the keys alone while a dialog elsewhere on the screen has focus", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderAt(RESULTS_PATH);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.innerHTML = "<button>Close</button>";
    document.body.append(dialog);
    dialog.querySelector("button")?.focus();
    await user.keyboard("{ArrowDown}{Enter}/");
    expect(screen.getByRole("button", { name: /^Preview WSO2Con 2025 - Regional Presentation/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Ask a question" })).not.toHaveFocus();
    dialog.remove();
    open.mockRestore();
  });

  it("leaves the arrow keys alone while a question is being typed", async () => {
    const user = userEvent.setup();
    renderAt(RESULTS_PATH);
    await user.click(screen.getByRole("textbox", { name: "Ask a question" }));
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /^Preview WSO2Con 2025 - Regional Presentation/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("jumps to the search box on a slash, on both screens, but not while typing in it", async () => {
    const user = userEvent.setup();
    const first = renderAt("/sales/library");
    const box = () => screen.getByRole("textbox", { name: "Ask a question" });
    box().blur();
    await user.keyboard("/");
    expect(box()).toHaveFocus();
    await user.keyboard("a/b");
    expect(box()).toHaveValue("a/b");
    first.unmount();

    renderAt(RESULTS_PATH);
    await user.click(document.body);
    await user.keyboard("/");
    expect(box()).toHaveFocus();
  });
});

describe("refreshing the page", () => {
  const loadedAs = (type: string, name = window.location.href) =>
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type, name }] as unknown as PerformanceEntryList);

  beforeEach(() => resetRefreshForTests());
  afterEach(() => vi.restoreAllMocks());

  it("lands on the start screen when a search address is refreshed", () => {
    loadedAs("reload");
    renderAt(RESULTS_PATH);
    expect(screen.queryAllByTestId("library-result")).toHaveLength(0);
    expect(screen.getByRole("textbox", { name: "Ask a question" })).toHaveValue("");
    expect(screen.getByText("Start with a topic")).toBeInTheDocument();
    expect(where()).toBe("/sales/library");
  });

  it("runs searches as usual afterwards", async () => {
    const user = userEvent.setup();
    loadedAs("reload");
    renderAt(RESULTS_PATH);
    await user.type(screen.getByRole("textbox", { name: "Ask a question" }), "pricing{Enter}");
    expect(where()).toBe("/sales/library?q=pricing");
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });

  it("opens the search when the address is opened as a link, a pin or with the back button", () => {
    for (const type of ["navigate", "back_forward"]) {
      resetRefreshForTests();
      loadedAs(type);
      const view = renderAt(RESULTS_PATH);
      expect(screen.getAllByTestId("library-result")).toHaveLength(5);
      expect(where()).toBe(RESULTS_PATH);
      view.unmount();
    }
  });

  it("leaves a search alone when the refresh was of some other page", () => {
    loadedAs("reload", "http://localhost:3000/somewhere-else");
    renderAt(RESULTS_PATH);
    expect(screen.getAllByTestId("library-result")).toHaveLength(5);
  });
});
