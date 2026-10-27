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
import type { JSX } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCurrencies, useQuote, useQuoteList } from "./useQuoteApi";

// What the backend answers; tests change it between visits.
const backend = { status: "DRAFT", currencies: ["USD"] };
const authedGet = vi.fn(async (url: string) => {
  if (url.endsWith("/currencies")) return [...backend.currencies];
  if (url.includes("/quotes?")) return { items: [{ id: 1, status: backend.status }], total: 1 };
  return { id: 1, status: backend.status, actions: backend.status === "SUBMITTED" ? ["RECALL"] : ["CLOSE"], versions: [] };
});

vi.mock("@api/http", () => ({ authedGet: (url: string) => authedGet(url), HttpError: class extends Error {} }));
vi.mock("@features/sales/cado2/api/cado2Basis", () => ({
  useCado2Basis: () => ({
    getToken: async () => "token",
    ready: true,
    key: (...parts: unknown[]) => ["cado2", "user-1", ...parts],
  }),
}));
vi.mock("@config/apiConfig", () => ({
  cado2ServiceUrls: {
    quote: (id: number) => `/quotes/${id}`,
    quoteList: () => `/quotes?limit=200`,
    currencies: "/currencies",
  },
}));

// The shared client's defaults (AppWithConfig): nothing refetches on mount by default.
const appClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, refetchOnReconnect: false, refetchOnMount: false, retry: false },
    },
  });

function QuotePage(): JSX.Element {
  const { data } = useQuote(1);
  return <p>{data ? `${data.status} ${data.actions.join(",")}` : "loading"}</p>;
}
function ListPage(): JSX.Element {
  const { data } = useQuoteList();
  return <p>{data ? `list ${data.items[0].status}` : "loading"}</p>;
}
function CurrencyPicker(): JSX.Element {
  const { data } = useCurrencies();
  return <p>{data ? `currencies ${data.join(",")}` : "loading"}</p>;
}

describe("CadO2 quote data is fresh whenever a page opens", () => {
  it("shows Submitted + Recall after submitting elsewhere, with the shared client's cache settings", async () => {
    const client = appClient();
    backend.status = "DRAFT";

    // 1. Open the quote page while it is a draft.
    const first = render(
      <QueryClientProvider client={client}>
        <QuotePage />
        <ListPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("DRAFT CLOSE")).toBeInTheDocument();
    expect(await screen.findByText("list DRAFT")).toBeInTheDocument();
    first.unmount();

    // 2. In the wizard: submit, which marks the quote data out of date.
    backend.status = "SUBMITTED";
    await client.invalidateQueries({ queryKey: ["cado2", "user-1", "quotes"] });

    // 3. Back to the quote page and My Quotes.
    render(
      <QueryClientProvider client={client}>
        <QuotePage />
        <ListPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("SUBMITTED RECALL")).toBeInTheDocument();
    expect(await screen.findByText("list SUBMITTED")).toBeInTheDocument();
  });

  it("keeps the shared default for lookups: no re-fetch when a page opens", async () => {
    const client = appClient();
    backend.currencies = ["USD"];
    const first = render(
      <QueryClientProvider client={client}>
        <CurrencyPicker />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("currencies USD")).toBeInTheDocument();
    first.unmount();
    const calls = authedGet.mock.calls.filter(([u]) => u === "/currencies").length;

    backend.currencies = ["USD", "GBP"];
    render(
      <QueryClientProvider client={client}>
        <CurrencyPicker />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("currencies USD")).toBeInTheDocument();
    expect(authedGet.mock.calls.filter(([u]) => u === "/currencies").length).toBe(calls);
  });

  it("keys every query by the signed-in subject", async () => {
    const client = appClient();
    render(
      <QueryClientProvider client={client}>
        <CurrencyPicker />
      </QueryClientProvider>,
    );
    await screen.findByText(/currencies/);
    expect(client.getQueryCache().getAll().map((q) => q.queryKey)).toContainEqual(["cado2", "user-1", "currencies"]);
  });
});
