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

// Creating a release chunk is admin-only, including for a deep link straight to
// the page.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const state = vi.hoisted(() => ({
  isAdmin: false,
  create: vi.fn(async () => undefined),
}));

vi.mock("../api/useUmtGate", () => ({
  useUmtGate: () => ({
    isAuthorized: true,
    isUser: true,
    isAdmin: state.isAdmin,
    isProductLead: false,
    hasRole: () => true,
    isResolving: false,
    isError: false,
    retry: () => {},
  }),
}));

vi.mock("../api/useUmtUpdates", () => ({
  useUmtUpdatesByLifecycleState: () => ({
    data: {
      recordsTotal: 1,
      recordsFiltered: 1,
      data: [{ id: 11, products: [{ product: { name: "wso2am", version: "4.2.0.15.full" } }] }],
    },
    isError: false,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: () => {},
  }),
}));

vi.mock("../api/useUmtReleaseChunkActions", () => ({
  useUmtCreateReleaseChunk: () => ({ isPending: false, mutateAsync: state.create }),
}));

vi.mock("../components/UmtShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

const { default: UmtCreateReleaseChunkPage } = await import("../pages/UmtCreateReleaseChunkPage");

const renderPage = () =>
  render(
    <MemoryRouter>
      <UmtCreateReleaseChunkPage />
    </MemoryRouter>,
  );

describe("Create Release Chunk access", () => {
  beforeEach(() => {
    state.create.mockClear();
  });

  it("shows a non-admin the access notice and no way to create", () => {
    state.isAdmin = false;
    renderPage();

    expect(screen.getByText(/requires UMT Admin access/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create Release Chunk/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("shows an admin the selection grid", () => {
    state.isAdmin = true;
    renderPage();

    expect(screen.getByRole("button", { name: /Create Release Chunk/i })).toBeInTheDocument();
  });
});
