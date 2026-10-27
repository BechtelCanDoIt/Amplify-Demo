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
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { JSX } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import {
  emptyDraftForm,
  type DraftFormValues,
} from "@features/sales/cado2/quotes/form/draftForm";
import type { OpportunityQuote } from "@features/sales/cado2/quotes/api/quoteTypes";
import PrimaryQuoteField from "./PrimaryQuoteField";

// D68: the Overview's "Primary quote" tick.

const quotes = { data: undefined as OpportunityQuote[] | undefined };
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useOpportunityQuotes: () => ({
    ...quotes,
    error: null,
    isPending: false,
    isFetching: false,
  }),
}));

const oq = (
  quoteId: number,
  isPrimary: boolean,
  quoteNumber: string | null = `Q-26-0003${quoteId}`,
): OpportunityQuote => ({
  quoteId,
  quoteNumber,
  ownerEmail: "nimesha@wso2.com",
  isPrimary,
  status: "SUBMITTED",
  versionNumber: 1,
  currencyIsoCode: "USD",
  tcv: "1000.00",
  createdAt: "2026-10-02T08:00:00Z",
  updatedAt: "2026-10-02T08:00:00Z",
});

function Harness({ quoteId = null }: { quoteId?: number | null }): JSX.Element {
  const form = useForm<DraftFormValues>({
    defaultValues: { ...emptyDraftForm(), opportunityId: "006A" },
  });
  const ticked = useWatch({ control: form.control, name: "isPrimary" });
  return (
    <FormProvider {...form}>
      <PrimaryQuoteField quoteId={quoteId} opportunityId="006A" />
      <output aria-label="isPrimary">{String(ticked)}</output>
    </FormProvider>
  );
}

const box = () =>
  screen.getByRole("checkbox", { name: "Primary quote for this opportunity" });

beforeEach(() => {
  quotes.data = undefined;
});

describe("PrimaryQuoteField", () => {
  it("starts ticked on the opportunity's first quote, and can be unticked", async () => {
    quotes.data = [];
    render(<Harness />);

    expect(box()).toBeChecked();
    expect(
      screen.getByText(/Only the primary quote is synced to Salesforce/),
    ).toBeInTheDocument();
    await userEvent.setup().click(box());
    expect(screen.getByLabelText("isPrimary")).toHaveTextContent("false");
  });

  it("starts unticked when the opportunity has quotes, and asks before releasing the primary one", async () => {
    const user = userEvent.setup();
    quotes.data = [oq(1, false), oq(2, true)];
    render(<Harness />);

    expect(box()).not.toBeChecked();
    expect(
      screen.getByText(/The primary quote is Q-26-00032 \(nimesha@wso2.com\)/),
    ).toBeInTheDocument();

    await user.click(box());
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "Q-26-00032 (nimesha@wso2.com) is the primary quote for this opportunity. Saving this quote as primary releases it.",
    );
    expect(screen.getByLabelText("isPrimary")).toHaveTextContent("false"); // not until confirmed
    await user.click(
      within(dialog).getByRole("button", { name: "Make primary" }),
    );
    expect(screen.getByLabelText("isPrimary")).toHaveTextContent("true");
    expect(screen.getByText(/Saving releases Q-26-00032/)).toBeInTheDocument();
  });

  it("names a primary draft by its owner", () => {
    quotes.data = [oq(2, true, null)];
    render(<Harness quoteId={9} />);
    expect(
      screen.getByText(/The primary quote is A draft by nimesha@wso2.com/),
    ).toBeInTheDocument();
  });
});
