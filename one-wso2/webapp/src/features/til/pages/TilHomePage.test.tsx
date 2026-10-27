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
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { TilSubmission, TilUserInfoWire } from "../api/tilTypes";

// The data and mutation hooks are replaced with stand-ins the tests control.
// They pull Asgardeo into the module graph, and that package does not resolve
// under vitest's ESM loader. The entry dialog is stubbed for the same reason.
const mocks = vi.hoisted(() => ({
  state: { userInfo: undefined as TilUserInfoWire | undefined },
}));

const ENTRY: TilSubmission = {
  id: "entry",
  title: "Ask for the token lifetimes first",
  who: "Alex Sample",
  where: "Customer",
  whereDetail: "Acme Bank (sample)",
  what: "<p>Their access token lived for 5 minutes.</p>",
  submittedByEmail: "alex@example.com",
  createdAt: new Date("2026-10-04T15:34:13Z"),
  updatedAt: null,
  notifiedAt: null,
};

vi.mock("../api/useTilData", () => ({
  isTilBackendConfigured: () => true,
  useTilUserInfo: () => ({ data: mocks.state.userInfo }),
  useTilSubmissions: () => ({
    data: { items: [ENTRY], total: 1 },
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
  }),
  useTilExportEntries: () => vi.fn(),
}));
vi.mock("../api/useTilMutations", () => ({
  useDeleteTilSubmission: () => ({ mutate: vi.fn() }),
}));
vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock("../components/SubmitEntryDialog", () => ({ default: () => null }));

import TilHomePage from "./TilHomePage";

function renderPage(userInfo: TilUserInfoWire | undefined) {
  mocks.state.userInfo = userInfo;
  render(
    <MemoryRouter>
      <TilHomePage />
    </MemoryRouter>,
  );
}

describe("TilHomePage export", () => {
  beforeEach(() => {
    mocks.state.userInfo = undefined;
  });

  it("offers Export CSV to a moderator", () => {
    renderPage({ email: "mod@example.com", displayName: "Mod Sample", canModerate: true });
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
  });

  it("hides Export CSV from everyone else", () => {
    renderPage({ email: "dana@example.com", displayName: "Dana Sample", canModerate: false });
    expect(screen.getByText(ENTRY.title)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export CSV" })).not.toBeInTheDocument();
  });

  it("hides Export CSV until the user info says the caller may moderate", () => {
    renderPage(undefined);
    expect(screen.queryByRole("button", { name: "Export CSV" })).not.toBeInTheDocument();
  });
});
