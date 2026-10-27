// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));

const authedPut = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve(null));
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return { ...actual, authedPut: (...args: unknown[]) => authedPut(...args) };
});

// `@config/apiConfig` reads `window.config` once at module-load time (jsdom
// has no such global), so this must be set before the dynamic imports below.
(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const { useUmtUpdateFieldMutation } = await import("./useUmtUpdateFieldMutation");
const { umtServiceUrls } = await import("@config/apiConfig");

function renderMutation() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useUmtUpdateFieldMutation("42"), { wrapper }).result;
}

beforeEach(() => {
  authedPut.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUmtUpdateFieldMutation", () => {
  // The backend quotes the reason in the updated-ETA comment it posts on the
  // customer's case and the update's issues.
  it("PUTs a new worst-case estimate with its reason to the dedicated endpoint", async () => {
    const result = renderMutation();

    await act(async () => {
      await result.current.mutateAsync({
        field: "worstCaseEstimate",
        value: "2026-11-05",
        reason: "  Blocked on a dependency release  ",
      });
    });

    expect(authedPut).toHaveBeenCalledWith(umtServiceUrls.updateWorstCaseEstimate("42"), "token", {
      worstCaseEstimate: "2026-11-05",
      reason: "Blocked on a dependency release",
    });
  });

  it("PUTs any other field to the update itself", async () => {
    const result = renderMutation();

    await act(async () => {
      await result.current.mutateAsync({ field: "assignedTo", value: "dev@wso2.com" });
    });

    expect(authedPut).toHaveBeenCalledWith(umtServiceUrls.update("42"), "token", { assignedTo: "dev@wso2.com" });
  });
});
