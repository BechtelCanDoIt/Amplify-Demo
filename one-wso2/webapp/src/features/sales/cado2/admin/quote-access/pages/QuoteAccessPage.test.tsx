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
import userEvent from "@testing-library/user-event";
import QuoteAccessPage from "./QuoteAccessPage";

// D69: Admin → Quote access.

const setting = {
  data: undefined as unknown,
  error: null,
  isPending: true,
  isFetching: false,
  refetch: vi.fn(),
};
const save = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };
vi.mock("@features/sales/cado2/admin/quote-access/api/useQuoteAccess", () => ({
  useQuoteAccess: () => setting,
  useSaveQuoteAccess: () => save,
}));

beforeEach(() => {
  Object.assign(setting, {
    data: { access: "VIEW", updatedByEmail: null, updatedAt: null },
    isPending: false,
  });
  save.mutate = vi.fn();
});

describe("QuoteAccessPage", () => {
  it("shows the current setting and saves a change", async () => {
    const user = userEvent.setup();
    render(<QuoteAccessPage />);

    expect(
      screen.getByRole("radio", { name: /^View Every AM sees every quote/ }),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /^View and edit/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(save.mutate).toHaveBeenCalledWith("VIEW_EDIT", expect.anything());
  });

  it("says who changed it last", () => {
    setting.data = {
      access: "VIEW_EDIT",
      updatedByEmail: "admin@wso2.com",
      updatedAt: "2026-10-12T09:00:00Z",
    };
    render(<QuoteAccessPage />);
    expect(
      screen.getByText("Last changed 12 Oct 2026 · admin@wso2.com"),
    ).toBeInTheDocument();
  });
});
