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

import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ApprovalPreviewInput } from "./approvalTypes";
import { useApprovalPreview } from "./useApprovalApi";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";

vi.mock("@features/sales/cado2/api/cado2Basis", () => ({
  useCado2Basis: () => ({
    getToken: async () => "tok",
    ready: true,
    key: (...parts: unknown[]) => ["cado2", "user-1", ...parts],
  }),
}));
vi.mock("@config/apiConfig", () => ({ cado2ServiceUrls: { approvalPreview: "/approvals/preview" } }));
let respond: (v: unknown) => void = () => {};
vi.mock("@features/sales/cado2/api/cado2Http", () => ({
  cado2Send: vi.fn(() => new Promise((r) => (respond = r))),
}));

describe("useApprovalPreview", () => {
  it("shows nothing, not the previous graph, while a new preview loads", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const a = { draft: { sfOpportunityId: "A" } } as unknown as ApprovalPreviewInput;
    const b = { draft: { sfOpportunityId: "B" } } as unknown as ApprovalPreviewInput;
    const { result, rerender } = renderHook(({ body }) => useApprovalPreview(body), { wrapper, initialProps: { body: a } });

    await waitFor(() => expect(cado2Send).toHaveBeenCalledTimes(1));
    respond({ steps: ["graph for A"] });
    await waitFor(() => expect(result.current.data).toEqual({ steps: ["graph for A"] }));

    rerender({ body: b }); // e.g. reopening "Preview approvals" after an edit
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
