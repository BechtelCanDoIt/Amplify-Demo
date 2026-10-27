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
import { HttpError } from "@api/http";
import LegalEntitiesPage from "./LegalEntitiesPage";

const list = { data: undefined as unknown, error: null as unknown, isPending: true, isFetching: false, refetch: vi.fn() };
const mutation = () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as unknown });
const create = mutation();
const update = mutation();

// Mocked so the page is tested without Asgardeo, the network or window.config.
vi.mock("@features/sales/cado2/admin/legal-entities/api/useLegalEntities", () => ({
  useLegalEntities: () => list,
  useCreateLegalEntity: () => create,
  useUpdateLegalEntity: () => update,
}));

const row = {
  id: 7,
  code: "WSO2_LLC",
  name: "WSO2, LLC.",
  addressLine1: "787 Castro Street",
  addressLine2: null,
  city: "Mountain View",
  stateProvince: null,
  postalCode: null,
  country: "USA",
  phone: null,
  taxId: null,
  registrationNumber: null,
  isActive: true,
  updatedByEmail: "admin@wso2.com",
  updatedAt: "2026-09-25T10:00:00Z",
};

beforeEach(() => {
  Object.assign(list, { data: undefined, error: null, isPending: true });
  update.mutate.mockReset();
});

describe("LegalEntitiesPage", () => {
  it("shows a placeholder while loading", () => {
    render(<LegalEntitiesPage />);
    expect(screen.getByLabelText("Loading legal entities")).toBeInTheDocument();
  });

  it("invites the first entry when there are none", async () => {
    Object.assign(list, { isPending: false, data: [] });
    render(<LegalEntitiesPage />);
    expect(screen.getByText("No legal entities yet")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Add the first entity" }));
    expect(await screen.findByRole("heading", { name: "Add legal entity" })).toBeInTheDocument();
  });

  it("lists the entities and shows the selected one in full (master–detail)", async () => {
    const inactive = { ...row, id: 8, code: "WSO2_UK", name: "WSO2 UK Ltd", country: "United Kingdom", isActive: false, taxId: "GB999" };
    Object.assign(list, { isPending: false, data: [row, inactive] });
    render(<LegalEntitiesPage />);

    // Nothing under the title (frontend.md, "Page titles").
    expect(screen.queryByText(/the WSO2 companies a quote can be issued from/)).toBeNull();
    const items = within(screen.getByRole("list", { name: "Legal entities" })).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    // The first entity is selected and shown in full.
    const llc = within(screen.getByRole("region", { name: "WSO2, LLC." }));
    expect(llc.getByRole("heading", { name: "WSO2, LLC." })).toBeInTheDocument();
    expect(llc.getByText("WSO2_LLC")).toBeInTheDocument();
    expect(llc.getByText("787 Castro Street")).toBeInTheDocument();
    // The switch says whether it's active; no chip as well (C8, 2026-10-14).
    expect(llc.getByRole("switch", { name: "WSO2, LLC. active" })).toBeChecked();
    expect(llc.getAllByText("—")).toHaveLength(3); // no tax ID, registration or phone
    expect(llc.getByText(/Last changed .* · admin@wso2.com/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "WSO2 UK Ltd" }));
    const uk = within(screen.getByRole("region", { name: "WSO2 UK Ltd" }));
    expect(uk.getByRole("switch", { name: "WSO2 UK Ltd active" })).not.toBeChecked();
    expect(uk.getByText("GB999")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "WSO2 UK Ltd" })).toHaveAttribute("aria-current", "true");
  });

  it("searches and filters by status", async () => {
    const uk = { ...row, id: 8, code: "WSO2_UK", name: "WSO2 UK Ltd", country: "United Kingdom", isActive: false };
    Object.assign(list, { isPending: false, data: [row, uk] });
    render(<LegalEntitiesPage />);
    const user = userEvent.setup();
    const items = () => within(screen.getByRole("list", { name: "Legal entities" })).getAllByRole("listitem");

    await user.type(screen.getByRole("textbox", { name: "Search legal entities" }), "kingdom");
    expect(items()).toHaveLength(1);
    await user.clear(screen.getByRole("textbox", { name: "Search legal entities" }));
    await user.click(screen.getByRole("button", { name: "Active" }));
    expect(items()).toHaveLength(1);
    expect(within(items()[0]).getByText("WSO2, LLC.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Inactive" }));
    expect(within(items()[0]).getByText("WSO2 UK Ltd")).toBeInTheDocument();
  });

  it("says so when nothing matches the search", async () => {
    Object.assign(list, { isPending: false, data: [row] });
    render(<LegalEntitiesPage />);
    await userEvent.setup().type(screen.getByRole("textbox", { name: "Search legal entities" }), "nowhere");

    expect(screen.getByText("No legal entities match")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Legal entities" })).toBeNull();
  });

  it("edits the selected entity", async () => {
    Object.assign(list, { isPending: false, data: [row] });
    render(<LegalEntitiesPage />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Edit WSO2, LLC." }));

    expect(await screen.findByRole("heading", { name: "Edit WSO2_LLC" })).toBeInTheDocument();
    for (const section of ["Identity", "Registered Address", "Registration", "Availability"]) {
      expect(screen.getByRole("region", { name: section })).toBeInTheDocument();
    }
  });

  it("disables an entity from its switch instead of deleting it, after asking", async () => {
    Object.assign(list, { isPending: false, data: [row] });
    render(<LegalEntitiesPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("switch", { name: "WSO2, LLC. active" }));
    expect(update.mutate).not.toHaveBeenCalled();
    const dialog = within(screen.getByRole("dialog", { name: "Deactivate WSO2, LLC.?" }));
    expect(dialog.getByText(/must choose another legal entity before it can be submitted/)).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Deactivate" }));

    expect(update.mutate).toHaveBeenCalledWith({ id: 7, changes: { isActive: false } }, expect.anything());
  });

  it("opens the add panel", async () => {
    Object.assign(list, { isPending: false, data: [] });
    render(<LegalEntitiesPage />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Add entity" }));

    expect(await screen.findByRole("heading", { name: "Add legal entity" })).toBeInTheDocument();
  });

  it("reports a failed load with the backend's message", () => {
    Object.assign(list, { isPending: false, error: new HttpError("u", 403, '{"message":"Insufficient privileges"}') });
    render(<LegalEntitiesPage />);

    expect(screen.getByText(/Couldn't load legal entities\. Insufficient privileges/)).toBeInTheDocument();
  });
});
