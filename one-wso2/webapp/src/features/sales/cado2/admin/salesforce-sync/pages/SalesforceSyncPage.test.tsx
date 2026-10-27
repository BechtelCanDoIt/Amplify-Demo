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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SalesforceSyncPage from "./SalesforceSyncPage";

const setting = { data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() };
const save = {
  mutate: vi.fn((_on: boolean, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
  reset: vi.fn(),
  isPending: false,
  error: null as unknown,
};

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/admin/salesforce-sync/api/useSalesforceSync", () => ({
  useSalesforceSync: () => setting,
  useSaveSalesforceSync: () => save,
}));

beforeEach(() => {
  save.mutate.mockClear();
});

describe("SalesforceSyncPage (D84)", () => {
  it("asks before turning the sync on", async () => {
    Object.assign(setting, { isPending: false, data: { enabled: false, updatedByEmail: null, updatedAt: null } });
    render(<SalesforceSyncPage />);
    const user = userEvent.setup();
    const toggle = screen.getByRole("switch", { name: "Sync quotes to Salesforce" });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/CADO2 still reads accounts, opportunities and products/)).toBeInTheDocument();

    await user.click(toggle);
    expect(save.mutate).not.toHaveBeenCalled();
    const dialog = within(screen.getByRole("dialog", { name: "Turn on the Salesforce sync?" }));
    expect(dialog.getByText(/products not on the quote are removed/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Turn on" }));
    expect(save.mutate).toHaveBeenCalledWith(true, expect.anything());
  });

  it("turns it off at once, and says who changed it last", async () => {
    Object.assign(setting, {
      isPending: false,
      data: { enabled: true, updatedByEmail: "admin@wso2.com", updatedAt: "2026-10-15T10:00:00Z" },
    });
    render(<SalesforceSyncPage />);
    expect(screen.getByText("Last changed 15 Oct 2026 · admin@wso2.com")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("switch", { name: "Sync quotes to Salesforce" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(save.mutate).toHaveBeenCalledWith(false, expect.anything());
  });
});
