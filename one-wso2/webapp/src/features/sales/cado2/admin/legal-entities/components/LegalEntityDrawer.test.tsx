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

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LegalEntityDrawer from "./LegalEntityDrawer";
import type { LegalEntity } from "@features/sales/cado2/admin/legal-entities/api/legalEntityTypes";

const llc: LegalEntity = {
  id: 1,
  code: "WSO2_LLC",
  name: "WSO2, LLC.",
  addressLine1: "787 Castro Street",
  addressLine2: null,
  city: "Mountain View",
  stateProvince: "CA",
  postalCode: "94041",
  country: "USA",
  phone: null,
  taxId: "20-8384669",
  registrationNumber: "4426447",
  isActive: true,
  updatedByEmail: "admin@wso2.com",
  updatedAt: "2026-09-25T10:00:00Z",
};

function renderDrawer(entity: LegalEntity | null, onSave = vi.fn()) {
  render(<LegalEntityDrawer open entity={entity} onSave={onSave} onClose={vi.fn()} saving={false} saveError={null} />);
  return onSave;
}

describe("LegalEntityDrawer", () => {
  it("won't save a new entity until the required fields are filled", async () => {
    const onSave = renderDrawer(null);

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText("Code is required")).toBeInTheDocument();
    expect(screen.getByText("Legal name is required")).toBeInTheDocument();
    expect(screen.getByText("Country is required")).toBeInTheDocument();
  });

  it("explains the code format before the backend has to", async () => {
    renderDrawer(null);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Code/), "wso2-uk");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/upper-case letters, digits or underscores/)).toBeInTheDocument();
  });

  it("saves a completed new entity", async () => {
    const onSave = renderDrawer(null);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Code/), "WSO2_UK");
    await user.type(screen.getByLabelText(/^Legal name/), "WSO2 UK Ltd");
    await user.type(screen.getByLabelText(/^Address line 1/), "1 Street");
    await user.type(screen.getByLabelText(/^City/), "London");
    await user.type(screen.getByLabelText(/^Country/), "United Kingdom");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ code: "WSO2_UK", city: "London", taxId: "", isActive: true });
  });

  it("loads the entity for editing and keeps its code fixed", () => {
    renderDrawer(llc);

    expect(screen.getByRole("heading", { name: "Edit WSO2_LLC" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Code/)).toBeDisabled();
    expect(screen.getByLabelText(/^Tax ID/)).toHaveValue("20-8384669");
    expect(screen.getByText("The code can't be changed after creation.")).toBeInTheDocument();
  });
});
