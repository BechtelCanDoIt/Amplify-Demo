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
import { MemoryRouter, Route, Routes } from "react-router";
import { HttpError } from "@api/http";
import PricingFormulaHistoryPage from "./PricingFormulaHistoryPage";

const query = () => ({ data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() });
const formulas = query();
const versions = query();
const asked: string[] = [];
const save = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };
const remove = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({ usePricingFormulas: () => formulas }));
vi.mock("@features/sales/cado2/admin/pricing-formulas/api/usePricingFormulaAdmin", () => ({
  usePricingFormulaVersions: (productId: string) => {
    asked.push(productId);
    return versions;
  },
  useSavePricingFormula: () => save,
  useDeletePricingFormula: () => remove,
  useTryPricingFormula: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, data: undefined }),
  useFormulaProducts: () => ({ data: [], isPending: false, fetchStatus: "idle", error: null, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }),
}));

const PRODUCT = "01tSUPPORT00000AAA";
const version = (n: number, status: "ACTIVE" | "REMOVED", minimum = "25000", day = 15) => ({
  versionId: 10 + n,
  version: n,
  status,
  productId: PRODUCT,
  productName: "WSO2 Enterprise Support",
  productCode: "SUP-APIM",
  expression: status === "ACTIVE" ? "max($1, $2 * 10%)" : "",
  bindings:
    status === "ACTIVE"
      ? [
          { name: "$1", kind: "VALUE", value: minimum },
          { name: "$2", kind: "PRODUCTS", products: [{ id: "01tGW", name: "WSO2 API Manager", code: "SUB-API" }] },
        ]
      : [],
  unitOfMeasure: status === "ACTIVE" ? `Annual, higher of ${minimum} or 10%` : "",
  updatedByEmail: "admin@wso2.com",
  updatedAt: `2026-10-${day}T10:00:00Z`,
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/sales/cado2/admin/pricing-formulas/${PRODUCT}`]}>
      <Routes>
        <Route path="/sales/cado2/admin/pricing-formulas/:productId" element={<PricingFormulaHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.assign(formulas, { isPending: false, data: [] });
  Object.assign(versions, { data: undefined, error: null, isPending: true });
  asked.length = 0;
  save.mutate.mockReset();
  remove.mutate.mockReset();
});

describe("PricingFormulaHistoryPage", () => {
  it("shows the formula in force and every version, newest first (D82)", () => {
    const v3 = version(3, "ACTIVE", "30000", 20);
    Object.assign(formulas, { data: [v3] });
    Object.assign(versions, { isPending: false, data: [v3, version(2, "REMOVED", "", 16), version(1, "ACTIVE")] });
    renderPage();

    expect(asked).toContain(PRODUCT);
    expect(screen.getByRole("heading", { name: "WSO2 Enterprise Support" })).toBeInTheDocument();
    expect(screen.getByText("In force: v3 · 20 Oct 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pricing Formulas/ })).toHaveAttribute("href", "/sales/cado2/admin/pricing-formulas");

    const items = within(screen.getByRole("list", { name: "Versions, newest first" })).getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("aria-label"))).toEqual(["Version 3", "Version 2", "Version 1"]);
    expect(within(items[0]).getByText("In force")).toBeInTheDocument();
    expect(within(items[0]).getByText("$1 = 30000 · $2 = total of WSO2 API Manager")).toBeInTheDocument();
    expect(within(items[0]).getByText("Unit of measure: Annual, higher of 30000 or 10%")).toBeInTheDocument();
    expect(within(items[1]).getByText("Removed")).toBeInTheDocument();
    expect(within(items[2]).queryByText("In force")).toBeNull();
    expect(within(items[2]).getByText("$1 = 25000 · $2 = total of WSO2 API Manager")).toBeInTheDocument();
  });

  it("edits as the main button and removes from ⋯", async () => {
    const v1 = version(1, "ACTIVE");
    Object.assign(formulas, { data: [v1] });
    Object.assign(versions, { isPending: false, data: [v1] });
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = within(screen.getByRole("dialog", { name: "Formula for WSO2 Enterprise Support" }));
    expect(dialog.getByText(/This is v1\. Saving makes v2/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Remove formula" }));
    const confirm = within(screen.getByRole("dialog", { name: "Remove the formula of WSO2 Enterprise Support?" }));
    await user.click(confirm.getByRole("button", { name: "Remove formula" }));
    expect(remove.mutate).toHaveBeenCalledWith({ productId: PRODUCT }, expect.anything());
  });

  it("offers to add a removed formula back as its next version", async () => {
    Object.assign(versions, { isPending: false, data: [version(2, "REMOVED", "", 16), version(1, "ACTIVE")] });
    renderPage();
    expect(screen.getByText("Removed in v2 · 16 Oct 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Add Formula" }));
    const dialog = within(screen.getByRole("dialog", { name: "Formula for WSO2 Enterprise Support" }));
    expect(dialog.getByText(/Removed in v2\. Saving makes v3/)).toBeInTheDocument();
  });

  it("says so when the product never had a formula", () => {
    Object.assign(versions, { isPending: false, error: new HttpError("/admin/pricing-formulas/x/versions", 404, "{}") });
    renderPage();
    expect(screen.getByText("This product has no pricing formula")).toBeInTheDocument();
  });
});
