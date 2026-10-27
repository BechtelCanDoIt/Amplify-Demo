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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddCustomerDialog from "./AddCustomerDialog";

const authFetch = vi.fn();
vi.mock("@features/security/grc/shim/useAuthApiClient", () => ({
  useAuthApiClient: () => authFetch,
}));
vi.mock("@features/security/grc/shim/apiConfig", () => ({ BACKEND_BASE_URL: "http://backend.test" }));

const posts = () =>
  authFetch.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: init?.method,
    body: init?.body ? JSON.parse(String(init.body)) : null,
  }));

const created = { id: 9, name: "Acme Corp", code: "ACME", status: "ACTIVE" };

beforeEach(() => {
  authFetch.mockReset();
  authFetch.mockResolvedValue(new Response(JSON.stringify(created), { status: 201 }));
});

describe("AddCustomerDialog", () => {
  it("creates the customer, hands it back and closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    render(<AddCustomerDialog open onClose={onClose} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/Customer name/), "  Acme Corp ");
    await user.type(screen.getByLabelText(/Customer code/), "acme");
    await user.click(screen.getByRole("button", { name: "Add customer" }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(posts()).toEqual([
      { url: "http://backend.test/api/v1/risks/customers", method: "POST", body: { name: "Acme Corp", code: "ACME" } },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("needs a name and a well-formed code before it sends anything", async () => {
    const user = userEvent.setup();
    render(<AddCustomerDialog open onClose={() => {}} onCreated={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Add customer" }));
    expect(await screen.findByText("Customer name is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Customer name/), "Acme");
    await user.click(screen.getByRole("button", { name: "Add customer" }));
    expect(await screen.findByText(/1–12 capital letters or digits/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Customer code/), "AC-ME");
    await user.click(screen.getByRole("button", { name: "Add customer" }));
    expect(await screen.findByText(/1–12 capital letters or digits/)).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it("shows the backend's reason when it is refused, and stays open to retry", async () => {
    authFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: "customer code already exists" }), { status: 409 }),
    );
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<AddCustomerDialog open onClose={() => {}} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/Customer name/), "Acme");
    await user.type(screen.getByLabelText(/Customer code/), "ACME");
    await user.click(screen.getByRole("button", { name: "Add customer" }));
    expect(await screen.findByText(/customer code already exists/)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add customer" })).toBeEnabled();
  });
});
