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
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpError } from "@api/http";
import CurrenciesPage from "./CurrenciesPage";

const list = { data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() };
const mutation = () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as unknown, variables: undefined as unknown });
const add = mutation();
const toggle = mutation();

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/admin/currencies/api/useAdminCurrencies", () => ({
  useAdminCurrencies: () => list,
  useAddCurrency: () => add,
  useSetCurrencyActive: () => toggle,
}));

const row = (isoCode: string, isActive: boolean, pricebookCount: number | null, largestPricebookProducts: number | null = null) => ({
  isoCode, isActive, pricebookCount, largestPricebookProducts, updatedByEmail: "admin@wso2.com", updatedAt: "2026-09-30T10:00:00Z",
});

beforeEach(() => {
  Object.assign(list, { data: undefined, error: null, isPending: true });
  Object.assign(add, mutation());
  Object.assign(toggle, mutation());
});

describe("CurrenciesPage", () => {
  it("lists the currencies with their Salesforce price books, and switches one off", async () => {
    Object.assign(list, { isPending: false, data: [row("USD", true, 93, 230), row("BRL", false, 8, 146), row("KES", true, 0), row("EUR", true, null)] });
    render(<CurrenciesPage />);
    const user = userEvent.setup();

    expect(screen.getByText("Quote currencies (3 active)")).toBeInTheDocument();
    const table = within(screen.getByRole("table", { name: "Quote currencies" }));
    expect(table.getByText("93 price books")).toBeInTheDocument();
    expect(table.getByText("The fullest prices 230 products")).toBeInTheDocument();
    expect(table.getByText("None: quotes can't be priced")).toBeInTheDocument();
    expect(table.getByText("Couldn't check")).toBeInTheDocument();
    expect(table.getByRole("switch", { name: "Offer BRL to AMs" })).not.toBeChecked();

    // Switching off asks first (2026-10-13); switching on is instant.
    await user.click(table.getByRole("switch", { name: "Offer USD to AMs" }));
    expect(toggle.mutate).not.toHaveBeenCalled();
    const dialog = within(screen.getByRole("dialog", { name: "Stop offering USD?" }));
    expect(dialog.getByText(/Drafts already in it can still be saved and submitted/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Stop offering" }));
    expect(toggle.mutate).toHaveBeenCalledWith({ isoCode: "USD", isActive: false }, expect.anything());
    act(() => toggle.mutate.mock.calls[0][1].onSuccess());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("switch", { name: "Offer BRL to AMs" }));
    expect(toggle.mutate).toHaveBeenLastCalledWith({ isoCode: "BRL", isActive: true }, expect.anything());
  });

  it("adds a currency by its code, and shows why one is refused", async () => {
    Object.assign(list, { isPending: false, data: [row("USD", true, 93)] });
    const { rerender } = render(<CurrenciesPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Currency code"), "aud");
    await user.click(screen.getByRole("button", { name: "Add currency" }));
    expect(add.mutate).toHaveBeenCalledWith("AUD", expect.anything());

    add.error = new HttpError("u", 422, JSON.stringify({ message: "Salesforce has no active price book with prices in KES" }));
    rerender(<CurrenciesPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/no active price book with prices in KES/);
  });
});
