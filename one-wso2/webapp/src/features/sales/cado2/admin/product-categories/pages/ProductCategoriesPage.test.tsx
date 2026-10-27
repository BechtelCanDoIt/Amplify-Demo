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
import ProductCategoriesPage from "./ProductCategoriesPage";

const query = () => ({ data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() });
const mapped = query();
const search = query();
const set = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as unknown, variables: undefined as unknown };
const searchedFor: string[] = [];

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/admin/product-categories/api/useProductCategories", () => ({
  MIN_PRODUCT_SEARCH: 2,
  useProductCategories: () => mapped,
  useProductCategorySearch: (term: string) => {
    searchedFor.push(term);
    return search;
  },
  useSetProductCategory: () => set,
}));

const apim = {
  productId: "01t000000000001AAA",
  productName: "WSO2 API Manager",
  productCode: "APIM",
  category: "SUBSCRIPTION",
  updatedByEmail: "admin@wso2.com",
  updatedAt: "2026-09-29T10:00:00Z",
};
const support = { ...apim, productId: "01t000000000002AAA", productName: "WSO2 Enterprise Support Plan - APIM", productCode: "SUP", category: "SUPPORT" };

beforeEach(() => {
  Object.assign(mapped, { data: undefined, error: null, isPending: true });
  Object.assign(search, { data: undefined, error: null, isPending: true });
  set.mutate.mockReset();
  searchedFor.length = 0;
});

describe("ProductCategoriesPage", () => {
  it("explains what an unmapped product means when nothing is mapped", () => {
    Object.assign(mapped, { isPending: false, data: [] });
    render(<ProductCategoriesPage />);
    expect(screen.getByText("No products mapped yet")).toBeInTheDocument();
    expect(screen.getByText(/AMs choose its category on each line and Deal Desk checks it/)).toBeInTheDocument();
  });

  it("lists the mapped products, filters them, and re-maps or unmaps one", async () => {
    Object.assign(mapped, { isPending: false, data: [apim, support] });
    render(<ProductCategoriesPage />);
    const user = userEvent.setup();

    expect(screen.getByText("Mapped products (2)")).toBeInTheDocument();
    const table = within(screen.getByRole("table", { name: "Mapped products" }));
    expect(table.getByText("WSO2 API Manager")).toBeInTheDocument();
    expect(table.getAllByText(/ · admin@wso2.com$/)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Support" }));
    expect(table.queryByText("WSO2 API Manager")).toBeNull();
    await user.click(screen.getByRole("button", { name: "All" }));

    await user.click(table.getByRole("combobox", { name: "Category of WSO2 API Manager" }));
    await user.click(screen.getByRole("option", { name: "Professional Service" }));
    expect(set.mutate).toHaveBeenLastCalledWith({ productId: apim.productId, category: "PROFESSIONAL_SERVICE" }, expect.anything());

    await user.click(table.getByRole("combobox", { name: "Category of WSO2 Enterprise Support Plan - APIM" }));
    await user.click(screen.getByRole("option", { name: "Not mapped" }));
    // Removing a mapping asks first (2026-10-13).
    expect(set.mutate).toHaveBeenCalledTimes(1);
    const dialog = within(screen.getByRole("dialog", { name: "Remove the category of WSO2 Enterprise Support Plan - APIM?" }));
    await user.click(dialog.getByRole("button", { name: "Remove category" }));
    expect(set.mutate).toHaveBeenLastCalledWith({ productId: support.productId, category: null }, expect.anything());
  });

  it("finds a Salesforce product and maps it", async () => {
    Object.assign(mapped, { isPending: false, data: [] });
    Object.assign(search, {
      isPending: false,
      data: [{ productId: "01t000000000003AAA", productName: "WSO2 Micro Integrator (cores)", productCode: "MI", family: "Integration-Software", category: null }],
    });
    render(<ProductCategoriesPage />);
    const user = userEvent.setup();
    expect(screen.getByText(/Find a product, then choose its category/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search Salesforce products"), "micro");

    const results = within(await screen.findByRole("table", { name: "Search results" }));
    expect(results.getByText("MI · Integration-Software")).toBeInTheDocument();
    const select = results.getByRole("combobox", { name: "Category of WSO2 Micro Integrator (cores)" });
    expect(select).toHaveTextContent("Not mapped");
    await user.click(select);
    await user.click(screen.getByRole("option", { name: "Subscription" }));
    expect(set.mutate).toHaveBeenLastCalledWith({ productId: "01t000000000003AAA", category: "SUBSCRIPTION" }, expect.anything());
  });
});
