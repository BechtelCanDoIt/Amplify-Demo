/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { HttpError } from "@api/http";

const authedGet = vi.fn();
vi.mock("@api/http", async () => {
  const actual = await vi.importActual<typeof import("@api/http")>("@api/http");
  return { ...actual, authedGet: (...args: unknown[]) => authedGet(...args) };
});
vi.mock("@hooks/useAccessToken", () => ({ useAccessToken: () => async () => "token" }));
vi.mock("@asgardeo/react", () => ({ useAsgardeo: () => ({ isSignedIn: true }) }));
vi.mock("@hooks/useAsgardeoSub", async () => {
  const actual =
    await vi.importActual<typeof import("@hooks/useAsgardeoSub")>("@hooks/useAsgardeoSub");
  return { ...actual, useAsgardeoSub: () => ({ state: { status: "ready", sub: "uid-1" }, retry: vi.fn() }) };
});
vi.mock("@config/apiConfig", () => ({
  isOpdBackendConfigured: () => true,
  opdServiceUrls: { userInfo: "https://opd.example/user-info" },
}));

const { useOpdUserInfo } = await import("./useOpd");

function Screen() {
  const q = useOpdUserInfo();
  return <span data-testid="roles">{q.isSuccess ? `roles:${q.data?.userRoles.length}` : q.status}</span>;
}

function mountScreen(qc: QueryClient) {
  const wrap = (children: ReactNode) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(wrap(<Screen />));
}

beforeEach(() => {
  authedGet.mockReset();
});

// A query that ERRORS holds no data, so `staleTime` has nothing to serve a
// later subscriber from — React Query treats each new observer as needing a
// first fetch, and `refetchOnMount: false` does not stop it. Seven components
// call this hook, so for anyone without OPD access every move between finance
// screens produced another 403 against the OPD backend. Folding 403 into an
// empty role list makes it a cached SUCCESS, asked once and then left alone.
describe("a reader the OPD backend refuses with 403", () => {
  function client() {
    return new QueryClient({
      defaultOptions: {
        queries: { refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false },
      },
    });
  }

  it("is asked once, however many screens go on to ask", async () => {
    authedGet.mockRejectedValue(new HttpError("https://opd.example/user-info", 403, "no"));
    const qc = client();

    const first = mountScreen(qc);
    await waitFor(() => expect(authedGet).toHaveBeenCalledTimes(1));
    first.unmount();

    // Two more finance screens mount and ask the same question.
    mountScreen(qc).unmount();
    mountScreen(qc);
    await new Promise((r) => setTimeout(r, 50));

    expect(authedGet).toHaveBeenCalledTimes(1);
  });

  it("reads as a settled answer of no roles, not as a failure", async () => {
    authedGet.mockRejectedValue(new HttpError("https://opd.example/user-info", 403, "no"));
    const qc = client();

    const { getByTestId } = mountScreen(qc);

    await waitFor(() => expect(getByTestId("roles")).toHaveTextContent("roles:0"));
  });

  // "The server is broken" and "you are not an OPD user" are different
  // answers, and flattening one into the other would hide a real outage.
  it("leaves a 500 as a real error", async () => {
    authedGet.mockRejectedValue(new HttpError("https://opd.example/user-info", 500, "boom"));
    const qc = client();

    const { getByTestId } = mountScreen(qc);

    await waitFor(() => expect(getByTestId("roles")).toHaveTextContent("error"), { timeout: 5000 });
  });
});
