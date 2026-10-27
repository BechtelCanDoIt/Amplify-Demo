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
import { MemoryRouter } from "react-router";
import PricingFormulasPage from "./PricingFormulasPage";

const query = () => ({ data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() });
const formulas = query();

// The formula editor's product list: `asked` records each search and whether the list was open.
const productList = {
  data: [] as unknown[],
  isPending: false,
  fetchStatus: "idle",
  error: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  asked: [] as { term: string; open: boolean }[],
};

// A mutation whose next answer a test sets; mutate calls onSuccess with it.
function mutation() {
  const m = {
    answer: undefined as unknown,
    mutate: vi.fn((_vars: unknown, opts?: { onSuccess?: (r: unknown) => void }) => opts?.onSuccess?.(m.answer)),
    reset: vi.fn(),
    isPending: false,
    error: null as unknown,
    data: undefined as unknown,
  };
  return m;
}
const save = mutation();
const remove = mutation();
const tryIt = mutation();

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({ usePricingFormulas: () => formulas }));
vi.mock("@features/sales/cado2/admin/pricing-formulas/api/usePricingFormulaAdmin", () => ({
  useSavePricingFormula: () => save,
  useDeletePricingFormula: () => remove,
  useTryPricingFormula: () => tryIt,
  useFormulaProducts: (term: string, open: boolean) => {
    productList.asked.push({ term, open });
    return productList;
  },
}));

const support = {
  versionId: 6,
  version: 2,
  status: "ACTIVE",
  productId: "01tSUPPORT00000AAA",
  productName: "WSO2 Enterprise Support",
  productCode: "SUP",
  expression: "max($1, $2 * $3)",
  bindings: [
    { name: "$1", kind: "VALUE", value: "25000" },
    { name: "$2", kind: "VALUE", value: "10%" },
    { name: "$3", kind: "PRODUCTS", products: [{ id: "01tGATEWAY00000AAA", name: "API Gateway", code: "GW" }] },
  ],
  unitOfMeasure: "Annual, higher of 25,000 or 10% of subscription",
  updatedByEmail: "admin@wso2.com",
  updatedAt: "2026-10-15T10:00:00Z",
};

beforeEach(() => {
  Object.assign(formulas, { data: undefined, error: null, isPending: true });
  for (const m of [save, remove, tryIt]) {
    m.mutate.mockClear();
    m.answer = undefined;
    m.data = undefined;
  }
});

describe("PricingFormulasPage", () => {
  it("says every product is priced from its price book when there are no formulas", () => {
    Object.assign(formulas, { isPending: false, data: [] });
    renderPage();
    expect(screen.getByText("No pricing formulas yet")).toBeInTheDocument();
    expect(screen.queryByText(/Removed Formulas/)).toBeNull();
  });

  it("lists the formulas in force with their version; a save is a new version, with nothing to confirm (D82)", async () => {
    const removed = { ...support, versionId: 9, version: 3, status: "REMOVED", productId: "01tOTHER000000AAA", productName: "Old Support" };
    Object.assign(formulas, { isPending: false, data: [support, removed] });
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("Formulas (1)")).toBeInTheDocument();
    const table = within(screen.getByRole("table", { name: "Pricing formulas" }));
    expect(table.queryByText("Old Support")).toBeNull();
    expect(table.getByText("max($1, $2 * $3)")).toBeInTheDocument();
    expect(table.getByText("$1 = 25000 · $2 = 10% · $3 = total of API Gateway")).toBeInTheDocument();
    expect(table.getByText("v2")).toBeInTheDocument();
    expect(table.getByText("Unit of measure: Annual, higher of 25,000 or 10% of subscription")).toBeInTheDocument();

    await user.click(table.getByRole("button", { name: "Edit the formula of WSO2 Enterprise Support" }));
    const dialog = within(screen.getByRole("dialog", { name: "Formula for WSO2 Enterprise Support" }));
    expect(dialog.getByText(/This is v2\. Saving makes v3; quotes keep the version they were priced with/)).toBeInTheDocument();
    expect(dialog.getByRole("textbox", { name: "Formula" })).toHaveValue("max($1, $2 * $3)");
    expect(dialog.getByRole("textbox", { name: "Unit of measure" })).toHaveValue("Annual, higher of 25,000 or 10% of subscription");
    await user.clear(dialog.getByRole("textbox", { name: "Value of $1" }));
    await user.type(dialog.getByRole("textbox", { name: "Value of $1" }), "30000");

    save.answer = { ...support, version: 3 };
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(save.mutate).toHaveBeenCalledTimes(1);
    expect(save.mutate).toHaveBeenLastCalledWith(
      {
        productId: support.productId,
        expression: "max($1, $2 * $3)",
        unitOfMeasure: "Annual, higher of 25,000 or 10% of subscription",
        bindings: [
          { name: "$1", kind: "VALUE", value: "30000", productIds: [] },
          { name: "$2", kind: "VALUE", value: "10%", productIds: [] },
          { name: "$3", kind: "PRODUCTS", value: "", productIds: ["01tGATEWAY00000AAA"] },
        ],
      },
      expect.anything(),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for a placeholder's value or products as it is typed, and tries the formula with samples", async () => {
    Object.assign(formulas, { isPending: false, data: [] });
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "New Formula" }));
    const dialog = within(screen.getByRole("dialog", { name: "New formula" }));
    expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.type(dialog.getByRole("textbox", { name: "Formula" }), "min($1, $2 * QTY)");
    // D83: the unit of measure is required.
    expect(dialog.getByRole("textbox", { name: "Unit of measure" })).toBeRequired();
    expect(dialog.getByText("$1")).toBeInTheDocument();
    expect(dialog.getByText("$2")).toBeInTheDocument();
    await user.click(within(dialog.getByRole("group", { name: "What $2 is" })).getByRole("button", { name: "Products" }));
    expect(dialog.getByRole("combobox", { name: "Products of $2" })).toBeInTheDocument();

    await user.type(dialog.getByRole("textbox", { name: "Value of $1" }), "5000");
    await user.type(dialog.getByRole("textbox", { name: "Sample total for $2" }), "1000");
    await user.clear(dialog.getByRole("textbox", { name: "QTY" }));
    await user.type(dialog.getByRole("textbox", { name: "QTY" }), "3");
    await user.click(dialog.getByRole("button", { name: "Try it" }));
    expect(tryIt.mutate).toHaveBeenLastCalledWith({
      expression: "min($1, $2 * QTY)",
      bindings: [
        { name: "$1", kind: "VALUE", value: "5000", productIds: [] },
        { name: "$2", kind: "PRODUCTS", value: "", productIds: [] },
      ],
      samples: { $2: "1000" },
      quantity: 3,
      listPrice: "",
    });
  });

  it("lists products as the Add line dialog does: on opening, with their code, a page at a time (2026-10-15)", async () => {
    Object.assign(formulas, { isPending: false, data: [] });
    productList.data = [
      { id: "01tGATEWAY00000AAA", name: "API Gateway", code: "APIM-GW", description: "API Gateway. Per gateway." },
      { id: "01tSUPPORT00000AAA", name: "Enterprise Support", code: "SUP", description: null },
    ];
    productList.hasNextPage = true;
    try {
      renderPage();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "New Formula" }));
      const dialog = within(screen.getByRole("dialog", { name: "New formula" }));
      expect(productList.asked.at(-1)).toEqual({ term: "", open: false });

      // Opening lists products before anything is typed.
      await user.click(dialog.getByRole("combobox", { name: "Product" }));
      expect(productList.asked.at(-1)).toEqual({ term: "", open: true });
      const option = await screen.findByRole("option", { name: /API Gateway \(APIM-GW\)/ });
      expect(within(option).getByText("Per gateway.")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 · scroll for more")).toBeInTheDocument();
      await user.click(option);
      expect(dialog.getByRole("combobox", { name: "Product" })).toHaveValue("API Gateway (APIM-GW)");
    } finally {
      productList.data = [];
      productList.hasNextPage = false;
    }
  });

  it("removes a formula after confirming, saying quotes keep their versions", async () => {
    Object.assign(formulas, { isPending: false, data: [support] });
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove the formula of WSO2 Enterprise Support" }));
    expect(remove.mutate).not.toHaveBeenCalled();

    const dialog = within(screen.getByRole("dialog", { name: "Remove the formula of WSO2 Enterprise Support?" }));
    expect(dialog.getByText(/New lines of this product will be priced from the price book/)).toBeInTheDocument();
    expect(dialog.getByText(/Quotes that already use a version of this formula keep it/)).toBeInTheDocument();
    remove.answer = { ...support, version: 3, status: "REMOVED" };
    await user.click(dialog.getByRole("button", { name: "Remove formula" }));
    expect(remove.mutate).toHaveBeenLastCalledWith({ productId: support.productId }, expect.anything());
  });

  it("links each product to its history, and lists removed formulas apart, collapsed (2026-10-15)", async () => {
    const removed = { ...support, versionId: 9, version: 3, status: "REMOVED", productId: "01tOTHER000000AAA", productName: "Old Support" };
    Object.assign(formulas, { isPending: false, data: [support, removed] });
    renderPage();
    expect(screen.getByRole("link", { name: "WSO2 Enterprise Support" })).toHaveAttribute(
      "href",
      "/sales/cado2/admin/pricing-formulas/01tSUPPORT00000AAA",
    );
    expect(screen.getByText("Removed Formulas (1)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Old Support" })).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByRole("link", { name: "Old Support" })).toHaveAttribute("href", "/sales/cado2/admin/pricing-formulas/01tOTHER000000AAA");
    expect(screen.getByText("removed in v3 · 15 Oct 2026")).toBeInTheDocument();
  });
});

function renderPage() {
  render(
    <MemoryRouter>
      <PricingFormulasPage />
    </MemoryRouter>,
  );
}
