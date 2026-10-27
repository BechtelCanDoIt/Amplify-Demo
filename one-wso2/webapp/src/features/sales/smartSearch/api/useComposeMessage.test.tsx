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

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpError } from "@api/http";
import { RequestTimeoutError } from "../util/libraryFailure";

const mocks = vi.hoisted(() => ({ authedPost: vi.fn(), getAccessToken: vi.fn() }));

vi.mock("@api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@api/http")>()),
  authedPost: mocks.authedPost,
}));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => mocks.getAccessToken }));
vi.mock("@config/apiConfig", () => ({
  smartSearchServiceUrls: { compose: () => "https://backend.test/smart-search/compose" },
}));

import { COMPOSE_TIMEOUT_MS, useComposeMessage } from "./useComposeMessage";

// A client that would retry a failed mutation three times, if the hook let it.
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: 3 } } })}>{children}</QueryClientProvider>
);

const variables = { query: "wso2con", documentIds: ["389", "1128"], intent: "email" as const };

async function run(response: unknown) {
  mocks.authedPost.mockResolvedValueOnce(response);
  const { result } = renderHook(() => useComposeMessage(), { wrapper });
  result.current.mutate(variables);
  await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true));
  return result.current;
}

beforeEach(() => {
  mocks.authedPost.mockReset();
  mocks.getAccessToken.mockReset().mockResolvedValue("token-1");
});

describe("useComposeMessage", () => {
  it("sends the question, the results and the kind of message to the compose address, with the person's token", async () => {
    await run({ text: "Hello", documentIds: ["389"], subject: "A subject" });
    expect(mocks.authedPost).toHaveBeenCalledTimes(1);
    const [url, token, body] = mocks.authedPost.mock.calls[0]!;
    expect(url).toBe("https://backend.test/smart-search/compose");
    expect(token).toBe("token-1");
    expect(body).toEqual(variables);
  });

  it("gives back the text, the results it was written from and the subject", async () => {
    const result = await run({ text: "  Hello there  ", documentIds: ["389", "1128"], subject: "Gold tier pricing" });
    expect(result.data).toEqual({ text: "Hello there", documentIds: ["389", "1128"], subject: "Gold tier pricing" });
  });

  it("copes with a backend that sends no results or no subject", async () => {
    expect((await run({ text: "Hello" })).data).toEqual({ text: "Hello", documentIds: [], subject: null });
    expect((await run({ text: "Hello", documentIds: "389", subject: 5 })).data).toEqual({
      text: "Hello",
      documentIds: [],
      subject: null,
    });
    expect((await run({ text: "Hello", documentIds: [], subject: null })).data?.subject).toBeNull();
  });

  it.each([[{ text: "" }], [{ text: "   " }], [{}], [null]])("is an error when the message comes back empty (%j)", async (response) => {
    const result = await run(response);
    expect(result.isError).toBe(true);
    expect(result.error?.message).toMatch(/came back empty/);
  });

  it("passes a failure on as it is, so the page can tell a rate limit from the rest", async () => {
    mocks.authedPost.mockRejectedValueOnce(new HttpError("/x", 429, ""));
    const { result } = renderHook(() => useComposeMessage(), { wrapper });
    result.current.mutate(variables);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(HttpError);
    expect((result.current.error as HttpError).status).toBe(429);
  });

  it("is never tried a second time, since each try is a paid model call", async () => {
    mocks.authedPost.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useComposeMessage(), { wrapper });
    result.current.mutate(variables);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.authedPost).toHaveBeenCalledTimes(1);
  });

  it("stops waiting for a request that never answers, and says it was too slow", async () => {
    vi.useFakeTimers();
    try {
      mocks.authedPost.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useComposeMessage(), { wrapper });
      result.current.mutate(variables);
      await vi.advanceTimersByTimeAsync(COMPOSE_TIMEOUT_MS - 1);
      expect(result.current.isError).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(RequestTimeoutError);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves no timer waiting once it has an answer", async () => {
    vi.useFakeTimers();
    try {
      mocks.authedPost.mockResolvedValue({ text: "Hello", documentIds: [] });
      const { result } = renderHook(() => useComposeMessage(), { wrapper });
      result.current.mutate(variables);
      await vi.advanceTimersByTimeAsync(10);
      expect(result.current.isSuccess).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores a message that arrives after the wait was cancelled", async () => {
    let finish!: (value: unknown) => void;
    mocks.authedPost.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useComposeMessage(), { wrapper });
    result.current.mutate(variables);
    await waitFor(() => expect(result.current.isPending).toBe(true));
    act(() => result.current.reset());
    await waitFor(() => expect(result.current.isIdle).toBe(true));
    await act(async () => {
      finish({ text: "Too late.", documentIds: [] });
      await Promise.resolve();
    });
    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("waits longer than the backend does, so the reader is told what the backend found", () => {
    expect(COMPOSE_TIMEOUT_MS).toBeGreaterThan(120_000);
  });
});
