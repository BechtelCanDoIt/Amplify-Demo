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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));

const authedGet = vi.fn();
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return { ...actual, authedGet: (...args: unknown[]) => authedGet(...args) };
});

// `@config/apiConfig` reads `window.config` once at module-load time, so this
// must be set before the dynamic imports below first evaluate that module.
(window as unknown as { config: Record<string, string> }).config = {
  ONE_WSO2_UMT_BACKEND_URL: "https://umt.example.com",
};

const { useUmtDocumentationUrl } = await import("./useUmtDocumentationUrl");
const { UMT_DOCUMENTATION_URL_KEY } = await import("../lib/umtDocumentation");
const { umtServiceUrls } = await import("@config/apiConfig");

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  authedGet.mockReset();
});

describe("useUmtDocumentationUrl", () => {
  it("returns the configured link, caching it under the key the rail row reads", async () => {
    authedGet.mockResolvedValue({ url: " https://docs.example.com/umt " });
    const client = newClient();
    const { result } = renderHook(() => useUmtDocumentationUrl(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current).toBe("https://docs.example.com/umt"));
    expect(authedGet).toHaveBeenCalledWith(umtServiceUrls.documentation, "token");
    expect(client.getQueryData(UMT_DOCUMENTATION_URL_KEY)).toBe("https://docs.example.com/umt");
  });

  it.each([
    ["has none configured", { url: null }],
    ["sends a blank", { url: "  " }],
    ["sends a javascript: value", { url: "javascript:alert(1)" }],
    ["sends a bare hostname", { url: "docs.example.com" }],
  ])("returns no link when the backend %s", async (_label, body) => {
    authedGet.mockResolvedValue(body);
    const client = newClient();
    const { result } = renderHook(() => useUmtDocumentationUrl(), { wrapper: wrapper(client) });

    await waitFor(() => expect(client.getQueryData(UMT_DOCUMENTATION_URL_KEY)).toBe(""));
    expect(result.current).toBeUndefined();
  });

  it("asks nothing while disabled", () => {
    renderHook(() => useUmtDocumentationUrl(false), { wrapper: wrapper(newClient()) });
    expect(authedGet).not.toHaveBeenCalled();
  });

  it("sends one request however many components ask", async () => {
    authedGet.mockResolvedValue({ url: "https://docs.example.com/umt" });
    const client = newClient();
    const { result } = renderHook(
      () => [useUmtDocumentationUrl(), useUmtDocumentationUrl(), useUmtDocumentationUrl()],
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(result.current[0]).toBe("https://docs.example.com/umt"));
    expect(authedGet).toHaveBeenCalledTimes(1);
  });
});
