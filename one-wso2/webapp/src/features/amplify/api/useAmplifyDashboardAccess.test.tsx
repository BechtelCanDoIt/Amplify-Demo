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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAmplifyDashboardAccess } from "./useAmplifyEditorAccess";

const groupsState = vi.hoisted(() => ({
  value: { ready: true, groups: [] as string[], error: undefined as string | undefined, retry: () => undefined },
}));

vi.mock("@hooks/useAsgardeoGroups", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hooks/useAsgardeoGroups")>();
  return { ...actual, useAsgardeoGroups: () => groupsState.value };
});

function setGroups(groups: string[], ready = true) {
  groupsState.value = { ready, groups, error: undefined, retry: () => undefined };
}

beforeEach(() => setGroups([]));

describe("useAmplifyDashboardAccess", () => {
  it.each(["amplify_po", "amplify_marketing", "amplify_slt", "amplify_admin"])("lets %s in", (role) => {
    setGroups([role]);
    expect(renderHook(() => useAmplifyDashboardAccess()).result.current.hasAccess).toBe(true);
  });

  it("keeps a plain employee out", () => {
    setGroups(["some_other_group"]);
    expect(renderHook(() => useAmplifyDashboardAccess()).result.current.hasAccess).toBe(false);
  });

  it("answers no access, not resolving, when disabled", () => {
    setGroups(["amplify_po"]);
    const r = renderHook(() => useAmplifyDashboardAccess(false)).result.current;
    expect(r).toMatchObject({ hasAccess: false, isResolving: false });
  });

  it("is resolving, with no access, until the token is decoded", () => {
    setGroups(["amplify_po"], false);
    const r = renderHook(() => useAmplifyDashboardAccess()).result.current;
    expect(r).toMatchObject({ hasAccess: false, isResolving: true });
  });
});
