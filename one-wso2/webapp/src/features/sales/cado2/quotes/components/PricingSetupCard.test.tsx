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
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { emptyDraftForm, type DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";
import PricingSetupCard from "./PricingSetupCard";

const lookup = (data: unknown) => ({ data, isPending: false, isFetching: false, error: null, refetch: vi.fn() });
const opportunity = {
  id: "006A", name: "APIM Renewal 2026", currencyIsoCode: "EUR" as string | null,
  pricebook: { id: "01sEUR00000000001A", name: "EUR Price Book (Current)" } as { id: string; name: string } | null,
};
const books: Record<string, unknown[]> = {
  EUR: [
    { id: "01sEUR00000000001A", name: "EUR Price Book (Current)", current: true, productCount: 212 },
    { id: "01sEUR20250000001A", name: "EUR Price Book (2025)", current: false, productCount: 190 },
  ],
  USD: [{ id: "01sUSD00000000001A", name: "USD Price Book (Current)", current: true, productCount: null }],
};

vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useCurrencies: () => lookup(["USD", "EUR"]),
  usePricebooks: (currency: string) => lookup(currency ? (books[currency] ?? []) : undefined),
  useAccountOpportunities: () => lookup([opportunity]),
}));

function Value() {
  const [currency, book] = useWatch<DraftFormValues, ["currencyIsoCode", "defaultPricebookName"]>({
    name: ["currencyIsoCode", "defaultPricebookName"],
  });
  return <p>value: {currency || "none"} · {book || "none"}</p>;
}

function Harness({ values }: { values: Partial<DraftFormValues> }) {
  const form = useForm<DraftFormValues>({
    defaultValues: { ...emptyDraftForm(), accountId: "001A", opportunityId: "006A", ...values },
  });
  return (
    <FormProvider {...form}>
      <PricingSetupCard />
      <Value />
    </FormProvider>
  );
}

beforeEach(() => {
  opportunity.currencyIsoCode = "EUR";
  opportunity.pricebook = { id: "01sEUR00000000001A", name: "EUR Price Book (Current)" };
});

describe("PricingSetupCard", () => {
  it("shows the opportunity's currency and price book, locked, and fills them in", async () => {
    render(<Harness values={{}} />);
    const currency = screen.getByRole("textbox", { name: "Currency" });
    const book = screen.getByRole("textbox", { name: "Price book" });
    expect(currency).toHaveAttribute("readonly");
    expect(book).toHaveAttribute("readonly");
    expect(await screen.findByText("value: EUR · EUR Price Book (Current)")).toBeInTheDocument();
    expect(screen.getAllByText("From the Salesforce opportunity")).toHaveLength(2);
    expect(screen.queryByText("Products can't be added")).toBeNull();
  });

  it("follows the opportunity when Salesforce has changed since the draft was saved", async () => {
    render(<Harness values={{ currencyIsoCode: "USD", defaultPricebookId: "01sUSD00000000001A", defaultPricebookName: "USD Price Book (Current)" }} />);
    expect(await screen.findByText("value: EUR · EUR Price Book (Current)")).toBeInTheDocument();
  });

  it.each([
    ["no price book", () => (opportunity.pricebook = null), "The opportunity has no price book in Salesforce. Set its price book there"],
    [
      "a book with no active products in the currency",
      () => (opportunity.pricebook = { id: "01sOLD00000000001A", name: "EUR Price Book 2021" }),
      "The opportunity's price book, EUR Price Book 2021, is inactive in Salesforce or has no active products in EUR",
    ],
    ["a currency CadO2 doesn't offer", () => (opportunity.currencyIsoCode = "AUD"), "The opportunity is in AUD, which CADO2 doesn't offer. Ask an Admin to add AUD"],
    ["no currency", () => (opportunity.currencyIsoCode = null), "The opportunity has no currency in Salesforce"],
  ])("says what to fix in Salesforce, and leaves no book to add products from: %s", async (_name, setUp, says) => {
    setUp();
    render(<Harness values={{}} />);
    expect(screen.getByText("Products can't be added")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(says.replace(/[().]/g, "\\$&")))).toBeInTheDocument();
    expect(await screen.findByText(/· none$/)).toBeInTheDocument();
  });

  it("keeps a draft's currency that an Admin has since switched off", async () => {
    opportunity.currencyIsoCode = "GBP";
    opportunity.pricebook = null;
    render(<Harness values={{ currencyIsoCode: "GBP" }} />);
    expect(screen.queryByText(/which CADO2 doesn't offer/)).toBeNull();
    expect(screen.getByText(/has no price book in Salesforce/)).toBeInTheDocument();
  });
});
