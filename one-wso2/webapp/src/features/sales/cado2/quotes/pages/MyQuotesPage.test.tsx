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
import type { JSX } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import type { QuoteListItem } from "@features/sales/cado2/quotes/api/quoteTypes";
import { ready } from "@features/sales/cado2/quotes/testing/fixtures";
import MyQuotesPage from "./MyQuotesPage";

// The Quotes page (D70): tabs, status chips, list and tree layouts.

const query = () => ({
  data: undefined as unknown,
  error: null as unknown,
  isPending: true,
  isFetching: false,
  refetch: vi.fn(),
});
const lists = { mine: query(), all: query() };
const setPrimary = {
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null,
};
const deleteDraft = {
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null,
};

vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useQuoteList: (_status: string, scope: "mine" | "all") => lists[scope],
  useSetPrimary: () => setPrimary,
  useOpportunityQuotes: () => ({
    data: [],
    error: null,
    isPending: false,
    isFetching: false,
  }),
  // The draft a row menu deletes is loaded first.
  useQuoteVersion: () => ({
    data: ready,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useDeleteDraft: () => deleteDraft,
}));

const NOW = new Date().toISOString();
const item = (
  id: number,
  over: Partial<QuoteListItem> = {},
): QuoteListItem => ({
  id,
  quoteNumber: `Q-26-0000${id}`,
  status: "DRAFT",
  ownerEmail: "rep@wso2.com",
  sfAccountId: "001ACME",
  sfOpportunityId: "006ACMEAPIM",
  isPrimary: false,
  canEdit: true,
  accountName: "Acme Corp",
  opportunityName: "Acme APIM renewal",
  versionNumber: 1,
  currencyIsoCode: "USD",
  tcv: "123000.00",
  expiryDate: null,
  createdAt: "2026-10-02T08:00:00Z",
  // One time for every item: a fresh new Date() per item could tick between
  // items and reorder the list, which is sorted by last update.
  updatedAt: NOW,
  ...over,
});
const mine = [
  item(1, { versionNumber: 2, isPrimary: true }),
  item(2, {
    status: "APPROVED",
    sfAccountId: "001NW",
    accountName: "Northwind Logistics",
    sfOpportunityId: "006NW",
    opportunityName: "API Platform 2027",
  }),
  item(3, { status: "APPROVED" }),
  item(5, {
    status: "SUBMITTED",
    sfOpportunityId: "006ACMEIAM",
    opportunityName: "Acme IAM",
  }),
  item(4, { status: "RECALLED" }),
];
const everyone = [
  ...mine,
  item(6, {
    ownerEmail: "nimesha@wso2.com",
    canEdit: false,
    sfAccountId: "001SUVA",
    accountName: "Suva",
    sfOpportunityId: "006SUVA",
    opportunityName: "Renewal 2027",
  }),
];

function Where(): JSX.Element {
  const l = useLocation();
  return <output aria-label="Location">{l.pathname + l.search}</output>;
}

function renderPage(path = "/sales/cado2/quotes") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sales/cado2/quotes" element={<MyQuotesPage />} />
        <Route path="/sales/cado2/quotes/:id/quote" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const table = (name = "Quotes") => screen.getByRole("table", { name });
const bodyRows = (name = "Quotes") =>
  within(table(name)).getAllByRole("row").slice(1);

beforeEach(() => {
  Object.assign(lists.mine, {
    data: { items: mine, total: mine.length },
    error: null,
    isPending: false,
  });
  Object.assign(lists.all, {
    data: { items: everyone, total: everyone.length },
    error: null,
    isPending: false,
  });
  setPrimary.mutate = vi.fn();
  localStorage.clear();
});

describe("Quotes page", () => {
  it("shows my quotes as compact rows, with each tab's count", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Quotes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "My quotes 5" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("tab", { name: "All quotes 6" }),
    ).toBeInTheDocument();
    // Gone (2026-10-15 feedback): the status chips; the Status column stays.
    expect(screen.queryByRole("group", { name: "Filter by status" })).toBeNull();
    expect(within(table()).getByRole("columnheader", { name: /Status/ })).toBeInTheDocument();
    // Gone (2026-10-12 feedback): the big cards, "Needs your attention", "Expiring within 7 days".
    expect(screen.queryByRole("group", { name: "Quote counts" })).toBeNull();
    expect(
      screen.queryByText(/Needs your attention|Expiring within/),
    ).toBeNull();

    expect(
      within(table()).queryByRole("columnheader", { name: "Owner" }),
    ).toBeNull(); // always you
    const first = within(bodyRows()[0]);
    expect(first.getByLabelText("Primary quote")).toBeInTheDocument();
    expect(first.getByRole("link", { name: "Q-26-00001" })).toHaveAttribute(
      "href",
      "/sales/cado2/quotes/1/quote",
    );
    expect(first.getByText("Draft (v2)")).toBeInTheDocument();
    expect(first.getByText("2 Oct 2026")).toBeInTheDocument(); // created
    expect(first.getByText("just now")).toBeInTheDocument(); // updated
    expect(
      within(table()).queryByRole("columnheader", { name: /Total/ }),
    ).toBeNull(); // not needed (2026-10-12)

    await userEvent
      .setup()
      .click(within(bodyRows()[1]).getByText("Northwind Logistics"));
    expect(screen.getByLabelText("Location")).toHaveTextContent(
      "/sales/cado2/quotes/2/quote",
    ); // the whole row opens it
  });

  it("searches, and clears the search", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(
      screen.getByRole("textbox", { name: "Search quotes" }),
      "northwind",
    );
    expect(bodyRows()).toHaveLength(1);
    await user.clear(screen.getByRole("textbox", { name: "Search quotes" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search quotes" }),
      "zzz",
    );
    expect(screen.getByText("No quotes match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByRole("textbox", { name: "Search quotes" })).toHaveValue("");
  });

  // 2026-10-15: the tabs, search and layout are the table's own toolbar.
  it("puts the tabs, search and layout on the table's card", () => {
    renderPage();
    const card = table().closest(".MuiPaper-root") as HTMLElement;
    expect(within(card).getByRole("tablist", { name: "Whose quotes" })).toBeInTheDocument();
    expect(within(card).getByRole("textbox", { name: "Search quotes" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByRole("button", { name: "Tree" })).toBeInTheDocument();
  });


  it("shows everyone's quotes on All quotes, with an Owner column, found by search; others' rows are read-only", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "All quotes 6" }));
    expect(
      within(table()).getByRole("columnheader", { name: "Owner" }),
    ).toBeInTheDocument();
    const suva = within(bodyRows()[5]);
    expect(suva.getByText("nimesha@wso2.com")).toBeInTheDocument();
    expect(suva.queryByRole("button", { name: /^Actions for/ })).toBeNull(); // quote access View

    expect(screen.queryByRole("combobox", { name: "Owner" })).toBeNull(); // no owner dropdown (2026-10-12)
    await user.type(
      screen.getByRole("textbox", { name: "Search quotes" }),
      "nimesha",
    );
    expect(bodyRows()).toHaveLength(1);
  });

  it("lays quotes out as a tree, account › opportunity › quote, each branch collapsible, and remembers the choice", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tree" }));
    const tree = "Quotes by account and opportunity";
    expect(within(table(tree)).getByText("Acme Corp")).toBeInTheDocument();
    expect(
      within(table(tree)).getByText("Acme APIM renewal"),
    ).toBeInTheDocument();
    expect(
      within(table(tree)).getByText("★ Q-26-00001 is primary"),
    ).toBeInTheDocument();
    expect(
      within(table(tree)).getByText("Northwind Logistics"),
    ).toBeInTheDocument();
    expect(within(table(tree)).getAllByRole("link")).toHaveLength(5);

    await user.click(
      screen.getByRole("button", { name: "Collapse Acme APIM renewal" }),
    );
    expect(within(table(tree)).getAllByRole("link")).toHaveLength(2); // Acme IAM's and Northwind's
    await user.click(
      screen.getByRole("button", { name: "Collapse Acme Corp" }),
    );
    expect(within(table(tree)).queryByText("Acme IAM")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Expand Acme Corp" }));
    expect(within(table(tree)).getByText("Acme IAM")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(within(table(tree)).queryAllByRole("link")).toHaveLength(0);
    // A search opens every branch with a match.
    await user.type(
      screen.getByRole("textbox", { name: "Search quotes" }),
      "Q-26-00003",
    );
    expect(within(table(tree)).getAllByRole("link")).toHaveLength(1);

    expect(localStorage.getItem("cado2.quotes.layout")).toBe("tree");
  });

  it("makes a quote primary from its row menu, after asking; Delete draft only on drafts", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(
      within(bodyRows()[2]).getByRole("button", {
        name: "Actions for Q-26-00003",
      }),
    );
    expect(screen.queryByRole("menuitem", { name: "Delete draft" })).toBeNull(); // approved, not a draft
    await user.click(screen.getByRole("menuitem", { name: "Make primary" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Make primary",
      }),
    );
    expect(setPrimary.mutate).toHaveBeenCalledWith(
      { quoteId: 3, primary: true },
      expect.anything(),
    );
  });

  it("deletes a draft from its row menu, after asking", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(
      within(bodyRows()[0]).getByRole("button", {
        name: "Actions for Q-26-00001",
      }),
    );
    // The quote page's menu (2026-10-13): the everyday action first, Delete draft last.
    expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Remove primary", "Delete draft"]); // this draft is the primary
    await user.click(screen.getByRole("menuitem", { name: "Delete draft" }));
    const dialog = screen.getByRole("dialog", {
      name: "Delete this draft quote?",
    }); // never submitted, so no number
    await user.click(
      within(dialog).getByRole("button", { name: "Delete quote" }),
    );
    expect(deleteDraft.mutate).toHaveBeenCalledWith(
      {
        quoteId: ready.quote.id,
        version: ready.version.versionNumber,
        expectedUpdatedAt: ready.version.updatedAt,
      },
      expect.anything(),
    );
  });

  it("sorts on any column, ascending then descending", async () => {
    renderPage();
    const user = userEvent.setup();
    const numbers = () =>
      bodyRows().map((r) => within(r).getAllByRole("link")[0].textContent);

    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(
      within(bodyRows()[4]).getByText("Northwind Logistics"),
    ).toBeInTheDocument(); // A to Z
    await user.click(screen.getByRole("button", { name: "Account" }));
    expect(
      within(bodyRows()[0]).getByText("Northwind Logistics"),
    ).toBeInTheDocument(); // Z to A
    expect(
      screen.getByRole("columnheader", { name: /Account/ }),
    ).toHaveAttribute("aria-sort", "descending");

    await user.click(screen.getByRole("button", { name: "Quote" }));
    expect(numbers()).toEqual([
      "Q-26-00001",
      "Q-26-00002",
      "Q-26-00003",
      "Q-26-00004",
      "Q-26-00005",
    ]);
  });

  it("welcomes a rep with no quotes", () => {
    Object.assign(lists.mine, { data: { items: [], total: 0 } });
    renderPage();
    expect(screen.getByText("No quotes yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create your first quote" }),
    ).toHaveAttribute("href", "/sales/cado2/quotes/new");
  });
});
