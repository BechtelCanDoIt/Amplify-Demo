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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

// View-tab actions and the hotfix release calls, checked at the wire.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAsgardeoSub", () => ({
  useAsgardeoSub: () => ({ state: { status: "ready", sub: "user-under-test" }, retry: () => {} }),
  foldIdentityError: (query: unknown) => query,
}));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));

const authedGet = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve([]));
const authedPost = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(null));
const authedPut = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(null));
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return {
    ...actual,
    authedGet: (...args: unknown[]) => authedGet(...args),
    authedPost: (...args: unknown[]) => authedPost(...args),
    authedPut: (...args: unknown[]) => authedPut(...args),
  };
});

// `@config/apiConfig` reads `window.config` at module load.
(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const { useUmtMarkAsDuplicate, useUmtOnHoldUpdate } = await import("../api/useUmtUpdateActions");
const { umtDuplicateTargetError } = await import("../lib/umtDuplicate");
const { HttpError } = await import("@api/http");
const { useUmtHotfixTestStatus, useUmtReleaseHotfix, useUmtTriggerHotfixTests } = await import(
  "../api/useUmtHotfixRelease"
);
const { umtServiceUrls } = await import("@config/apiConfig");

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  authedGet.mockClear();
  authedPost.mockClear();
  authedPut.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("On Hold", () => {
  // On Hold is sent as a POST.
  it("POSTs the reason to the onHold endpoint", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUmtOnHoldUpdate("42"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("Waiting on the customer");
    });

    expect(authedPost).toHaveBeenCalledWith(umtServiceUrls.updateOnHold("42"), "token", {
      reason: "Waiting on the customer",
    });
    expect(authedPut).not.toHaveBeenCalled();
  });
});

describe("Mark as Duplicate", () => {
  it("accepts only another update's number", () => {
    expect(umtDuplicateTargetError("", "42")).toBeUndefined();
    expect(umtDuplicateTargetError(" 17 ", "42")).toBeUndefined();
    for (const value of ["abc", "12.5", "-3", "0", "017", "1e3"]) {
      expect(umtDuplicateTargetError(value, "42"), value).toBe("Enter an update number.");
    }
    expect(umtDuplicateTargetError("42", "42")).toBe("An update can't be a duplicate of itself.");
  });

  it("records the dependency once the target update exists", async () => {
    authedGet.mockResolvedValueOnce({ id: 17 });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUmtMarkAsDuplicate("42"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("17");
    });

    expect(authedGet).toHaveBeenCalledWith(umtServiceUrls.update("17"), "token");
    expect(authedPost).toHaveBeenCalledWith(umtServiceUrls.updateDependency, "token", {
      from: { id: "42" },
      to: { id: "17" },
      type: "Duplicate",
    });
  });

  it("refuses a target update that doesn't exist, without recording anything", async () => {
    authedGet.mockRejectedValueOnce(new HttpError(umtServiceUrls.update("999"), 404, ""));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUmtMarkAsDuplicate("42"), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("999")).rejects.toThrow("Update 999 does not exist.");
    });

    expect(authedPost).not.toHaveBeenCalled();
  });
});

describe("hotfix release", () => {
  it("reads the Jenkins test status at TestingEnvironmentCreated only", async () => {
    authedGet.mockResolvedValueOnce({ buildStatus: "success" });
    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(({ state }) => useUmtHotfixTestStatus("42", state), {
      wrapper,
      initialProps: { state: "TestingEnvironmentRequested" },
    });
    expect(authedGet).not.toHaveBeenCalled();

    rerender({ state: "TestingEnvironmentCreated" });

    await waitFor(() => expect(result.current.data).toBe("success"));
    expect(authedGet).toHaveBeenCalledWith(umtServiceUrls.updateHotfixJenkinsJobStatus("42"), "token");
  });

  it("reads a run that was never started as no status, not an error", async () => {
    authedGet.mockRejectedValueOnce(
      new HttpError(umtServiceUrls.updateHotfixJenkinsJobStatus("42"), 400, '{"message":"Jenkins job is not triggered"}'),
    );
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUmtHotfixTestStatus("42", "TestingEnvironmentCreated"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("starts the integration-test run", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUmtTriggerHotfixTests("42"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(authedPost).toHaveBeenCalledWith(umtServiceUrls.updateHotfixJenkinsJobTrigger("42"), "token", {});
  });

  it("POSTs the release with its reason, or a null one", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUmtReleaseHotfix("42"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("Known flaky test");
    });
    await act(async () => {
      await result.current.mutateAsync(null);
    });

    expect(authedPost).toHaveBeenNthCalledWith(1, umtServiceUrls.updateReleaseHotfix("42"), "token", {
      reason: "Known flaky test",
    });
    expect(authedPost).toHaveBeenNthCalledWith(2, umtServiceUrls.updateReleaseHotfix("42"), "token", { reason: null });
  });
});
