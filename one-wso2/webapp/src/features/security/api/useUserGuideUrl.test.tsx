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
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authFetch = vi.fn();
vi.mock("@features/security/grc/shim/useAuthApiClient", () => ({
  useAuthApiClient: () => authFetch,
}));

vi.mock("@config/apiConfig", () => ({
  securityBackendUrl: "https://example.invalid",
}));

import { useUserGuideUrl } from "./useUserGuideUrl";

function jsonOnce(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

function withQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useUserGuideUrl", () => {
  afterEach(() => {
    authFetch.mockReset();
  });

  it("fetches the configured URL from the meta endpoint when enabled", async () => {
    authFetch.mockReturnValueOnce(jsonOnce({ url: "https://example.com/user-guide" }));

    const { result } = renderHook(() => useUserGuideUrl(true), { wrapper: withQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.url).toBe("https://example.com/user-guide");
    expect(authFetch).toHaveBeenCalledWith("https://example.invalid/api/v1/meta/user-guide-url");
  });

  it("resolves to an empty url when the backend hasn't configured one", async () => {
    authFetch.mockReturnValueOnce(jsonOnce({ url: "" }));

    const { result } = renderHook(() => useUserGuideUrl(true), { wrapper: withQueryClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.url).toBe("");
  });

  it("does not fetch when disabled (e.g. a perspective other than Security)", () => {
    renderHook(() => useUserGuideUrl(false), { wrapper: withQueryClient() });
    expect(authFetch).not.toHaveBeenCalled();
  });

  it("surfaces a failed request as an error", async () => {
    authFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    const { result } = renderHook(() => useUserGuideUrl(true), { wrapper: withQueryClient() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
