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
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { AdapterDateFns, DatePickers } from "@wso2/oxygen-ui";
import {
  emptyDraftForm,
  type DraftFormValues,
  type LineValue,
} from "@features/sales/cado2/quotes/form/draftForm";
import SubscriptionTermCard from "./SubscriptionTermCard";

// D85: the Term card on Products & Pricing.

// The account's open opportunities (this quote's, with its own start date)
// and won ones (the ones a renewal renews).
const open = [{ id: "006R", name: "API Platform 2027", subsStartDate: "2027-03-01", subsEndDate: "2028-02-29" }];
const won = [{ id: "006W", name: "APIM Subs 2026", subsStartDate: "2026-02-01", subsEndDate: "2027-01-31" }];
vi.mock("@features/sales/cado2/quotes/api/useQuoteApi", () => ({
  useAccountOpportunities: (_: string | null, status = "open") => ({
    data: status === "won" ? won : open,
    error: null,
    isPending: false,
    isFetching: false,
  }),
}));

const line: LineValue = {
  lineId: null,
  pricebookEntryId: "01uGW",
  productName: "WSO2 Gateway",
  productCode: "GW",
  productDescription: "",
  pricebookId: "01sUSD",
  pricebookName: "USD",
  unitPrice: "360",
  category: "SUBSCRIPTION",
  categorySource: "MAPPED",
  recurring: true,
  unitOfMeasure: "",
  quantity: "1",
  discount: "",
};

/** What the form holds for the term and its billing. */
function Held(): JSX.Element {
  const [mode, end, billing] = useWatch<DraftFormValues, ["termMode", "termEndDate", "billingFrequency"]>({
    name: ["termMode", "termEndDate", "billingFrequency"],
  });
  return <output aria-label="Held">{`${mode || "none"} · ${end || "no end"} · ${billing || "no billing"}`}</output>;
}

function Harness({ values }: { values: Partial<DraftFormValues> }): JSX.Element {
  const form = useForm<DraftFormValues>({
    defaultValues: { ...emptyDraftForm(), accountId: "001A", startDate: "2027-01-01", lines: [line], ...values },
  });
  return (
    <DatePickers.LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormProvider {...form}>
        <SubscriptionTermCard />
        <Held />
      </FormProvider>
    </DatePickers.LocalizationProvider>
  );
}

describe("Term card", () => {
  it("locks a renewal's start to its own opportunity's Subs_Start_Date__c", () => {
    render(<Harness values={{ isRenewal: true, opportunityId: "006R", previousOpportunityIds: ["006W"], startDate: "2027-03-01" }} />);
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
    expect(screen.getByText("The opportunity's subscription start date in Salesforce")).toBeInTheDocument();
  });

  it("falls back to the day after the renewed opportunity ends, still locked", () => {
    render(<Harness values={{ isRenewal: true, opportunityId: "006N", previousOpportunityIds: ["006W"], startDate: "2027-02-01" }} />);
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
    expect(screen.getByText("The day after APIM Subs 2026 ends, in Salesforce")).toBeInTheDocument();
  });

  it("lets anything but a renewal change its start", () => {
    render(<Harness values={{ dealKind: "EXPANSION" }} />);
    expect(screen.queryByLabelText("Locked")).toBeNull();
  });

  it("starts on 1 year, annually in advance, with the end and duration shown", () => {
    render(<Harness values={{}} />);
    expect(screen.getByRole("radio", { name: "Number of years" })).toBeChecked();
    expect(screen.getByText("Ends 31 Dec 2027")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration")).toHaveTextContent("Duration: 1 year");
    expect(screen.getByLabelText("Held")).toHaveTextContent("YEARS · no end · ANNUAL");
  });

  it("works out the end from a number of years", async () => {
    const user = userEvent.setup();
    render(<Harness values={{}} />);
    await user.click(screen.getByRole("combobox", { name: "Years" }));
    await user.click(screen.getByRole("option", { name: "3 years" }));
    expect(screen.getByText("Ends 31 Dec 2029")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration")).toHaveTextContent("Duration: 3 years");
  });

  it("keeps the same end when switching to an end date", async () => {
    const user = userEvent.setup();
    render(<Harness values={{}} />);
    await user.click(screen.getByRole("radio", { name: "End date" }));
    expect(screen.getByLabelText("Held")).toHaveTextContent("END_DATE · 2027-12-31");
    expect(screen.getByRole("group", { name: "End date" })).toBeInTheDocument();
  });

  it("shows an odd end date's duration in words", () => {
    render(<Harness values={{ termMode: "END_DATE", termEndDate: "2028-01-01" }} />);
    expect(screen.getByLabelText("Duration")).toHaveTextContent("Duration: 1 year + 1 day");
    expect(screen.queryByText(/needs approval/)).toBeNull();
  });

  // Every deal, co-terminated or not (D85).
  it.each([["FIRST_SALE"], ["RENEWAL"], ["EXPANSION"]] as const)("says a %s term under a year needs approval", (dealKind) => {
    render(<Harness values={{ dealKind, termMode: "END_DATE", termEndDate: "2027-06-30" }} />);
    expect(screen.getByLabelText("Duration")).toHaveTextContent("6 months");
    expect(screen.getByText("A term under a year needs approval.")).toBeInTheDocument();
    expect(screen.queryByText(/co-terminated/)).toBeNull();
  });

  it("says a term over 3 years needs extended-term approval", () => {
    render(<Harness values={{ termMode: "YEARS", termYears: "4" }} />);
    expect(screen.getByText("A term over 3 years needs extended-term approval.")).toBeInTheDocument();
  });

  it("has no billing frequency: it has its own card (D86)", () => {
    render(<Harness values={{}} />);
    expect(screen.queryByRole("combobox", { name: /Billing frequency/ })).toBeNull();
  });

  // D90: the card is first on the step, so the term can be set before any product.
  it("asks for the term before there are products", () => {
    render(<Harness values={{ lines: [] }} />);
    expect(screen.getByText("Subscription Term")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Set the end by" })).toBeInTheDocument();
    expect(screen.queryByText(/No recurring products/)).toBeNull();
  });

  it("is only the start date when no product recurs, whatever its category (D76)", () => {
    render(<Harness values={{ lines: [{ ...line, recurring: false }] }} />);
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Set the end by" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Billing frequency/ })).toBeNull();
    expect(screen.getByText(/No recurring products, so no subscription term/)).toBeInTheDocument();
  });
});
