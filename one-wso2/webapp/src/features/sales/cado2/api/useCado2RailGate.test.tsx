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
import { renderHook } from "@testing-library/react";
import { CADO2_GROUP_ID, CADO2_ITEM, CADO2_ITEM_IDS } from "@constants/cado2Apps";
import { SALES_ITEM_IDS } from "@constants/perspectives";
import { claimOf, claimsForPerspective } from "@components/side-rail/visibilityFold";
import type { Cado2Me } from "./useCado2Me";
import { cado2CanSee, useCado2RailGate } from "./useCado2RailGate";

const state = {
  configured: true,
  me: { data: undefined as Cado2Me | undefined, isPending: false, isLoading: false, isError: false, error: null as unknown },
};

vi.mock("@config/apiConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@config/apiConfig")>()),
  isCado2BackendConfigured: () => state.configured,
}));
vi.mock("./useCado2Me", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useCado2Me")>()),
  useCado2Me: () => ({ ...state.me, refetch: vi.fn() }),
}));

const me = (roles: Cado2Me["roles"], approverRoles: string[] = []): Cado2Me => ({
  sub: "u1",
  email: "rep@wso2.com",
  roles,
  approverRoles,
});

const visible = (gate: ReturnType<typeof useCado2RailGate>) =>
  [CADO2_GROUP_ID, CADO2_ITEM.quotes, CADO2_ITEM.approvals, CADO2_ITEM.admin].filter((id) => gate.canSee(id));

beforeEach(() => {
  state.configured = true;
  state.me = { data: undefined, isPending: false, isLoading: false, isError: false, error: null };
});

describe("which CadO2 rows a person sees", () => {
  it("a rep sees My Quotes", () => {
    state.me.data = me(["SALES"]);
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toEqual([CADO2_GROUP_ID, CADO2_ITEM.quotes]);
  });

  it("an approver who doesn't quote sees My Approvals only", () => {
    state.me.data = me([], ["DEAL_DESK"]);
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toEqual([CADO2_GROUP_ID, CADO2_ITEM.approvals]);
  });

  it("an admin-only person sees Admin, and nothing else", () => {
    state.me.data = me(["ADMIN"]);
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toEqual([CADO2_GROUP_ID, CADO2_ITEM.admin]);
  });

  it("roles add up: an approver who is also an admin sees My Approvals and Admin, not My Quotes", () => {
    state.me.data = me(["ADMIN"], ["CFO"]);
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toEqual([CADO2_GROUP_ID, CADO2_ITEM.approvals, CADO2_ITEM.admin]);
  });

  it("a rep who is also an admin sees My Quotes and Admin", () => {
    state.me.data = me(["SALES", "ADMIN"]);
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toEqual([CADO2_GROUP_ID, CADO2_ITEM.quotes, CADO2_ITEM.admin]);
  });

  it("someone with no CadO2 role sees no CadO2 group at all", () => {
    state.me.data = me([]);
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toEqual([]);
  });

  it("nothing shows while /me is in flight, so no row flashes in and out", () => {
    state.me.isPending = true;
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(result.current.isResolving).toBe(true);
    expect(visible(result.current)).toEqual([]);
  });

  it("a failed check hides the rows and is reported as a failure, not as no access", () => {
    state.me.isError = true;
    state.me.error = new Error("gateway timeout");
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(result.current.isError).toBe(true);
    expect(visible(result.current)).toEqual([]);
  });

  it("with no backend configured every row stays, and each page explains what is missing", () => {
    state.configured = false;
    const { result } = renderHook(() => useCado2RailGate(true));
    expect(visible(result.current)).toHaveLength(4);
    expect(result.current.isResolving).toBe(false);
  });

  it("fails closed for an id it has no case for", () => {
    expect(cado2CanSee("sales-cado2-something-new", { canQuote: true, canApprove: true, isAdmin: true })).toBe(false);
  });
});

describe("the cado2 adapter's claim", () => {
  it("covers every CadO2 row, the group included", () => {
    expect(claimOf("cado2")).toEqual({ kind: "sections", ids: CADO2_ITEM_IDS });
    expect([...CADO2_ITEM_IDS].sort()).toEqual(
      [CADO2_GROUP_ID, CADO2_ITEM.quotes, CADO2_ITEM.approvals, CADO2_ITEM.admin].sort(),
    );
  });

  it("never overlaps the Meetings adapter in the same perspective", () => {
    for (const id of CADO2_ITEM_IDS) expect(SALES_ITEM_IDS.has(id)).toBe(false);
  });

  it("is in play for Sales only while the preview flag is on", () => {
    const saved = window.config;
    window.config = { ...(saved ?? {}), ONE_WSO2_PREVIEW_FEATURES: { cado2: true } } as Window["config"];
    expect(claimsForPerspective("sales")).toContain("cado2");
    expect(claimsForPerspective("finance")).not.toContain("cado2");
    window.config = { ...(saved ?? {}), ONE_WSO2_PREVIEW_FEATURES: {} } as Window["config"];
    expect(claimsForPerspective("sales")).not.toContain("cado2");
    window.config = saved;
  });
});
