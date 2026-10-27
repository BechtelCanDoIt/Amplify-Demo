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

import { describe, expect, it } from "vitest";
import type { DraftResponse } from "@features/sales/cado2/quotes/api/quoteTypes";
import {
  addressFrom,
  commissionProblem,
  durationText,
  emptyDraftForm,
  endDateFor,
  endDateProblem,
  expiryFor,
  formatDate,
  fromVersion,
  pulledLines,
  alignPreview,
  isExpired,
  parseDateString,
  splitStreet,
  termFromDates,
  stepOfField,
  storedPricing,
  termEnd,
  toDateString,
  toDraftInput,
  toPreviewBody,
  type DraftFormValues,
} from "./draftForm";

describe("dates", () => {
  it("ends a term the day before its anniversary", () => {
    expect(endDateFor("2027-01-01", 1)).toBe("2027-12-31");
    expect(endDateFor("2027-01-01", 3)).toBe("2029-12-31");
    expect(endDateFor("2027-07-15", 2)).toBe("2029-07-14");
  });

  it("clamps a leap-day start the way the backend does", () => {
    expect(endDateFor("2028-02-29", 1)).toBe("2029-02-27");
  });


  it("round-trips local dates without a UTC shift", () => {
    // setup.ts runs the suite in America/Los_Angeles to catch exactly this.
    expect(toDateString(parseDateString("2027-01-01")!)).toBe("2027-01-01");
    expect(parseDateString("2027-02-30")).toBeNull();
    expect(parseDateString("01/01/2027")).toBeNull();
  });
});

describe("addresses", () => {
  it("puts the first street line in line 1 and the rest in line 2", () => {
    expect(splitStreet("1200 Market Street\nSuite 400\nFloor 2")).toEqual(["1200 Market Street", "Suite 400, Floor 2"]);
    expect(splitStreet("  One line  ")).toEqual(["One line", ""]);
    expect(splitStreet(null)).toEqual(["", ""]);
  });

  it("pre-fills from a Salesforce account", () => {
    const a = addressFrom("001A", "Northwind", {
      street: "1200 Market Street\nSuite 400",
      city: "Philadelphia",
      stateProvince: "PA",
      postalCode: "19107",
      country: "USA",
    });
    expect(a).toMatchObject({
      sfAccountId: "001A",
      companyName: "Northwind",
      addressLine1: "1200 Market Street",
      addressLine2: "Suite 400",
      country: "USA",
      taxId: "",
    });
  });
});

function filled(): DraftFormValues {
  return {
    ...emptyDraftForm(),
    accountId: "001VM00000ABCDEAA4",
    opportunityId: "006VM00000O4AUSYA3",
    currencyIsoCode: "USD",
    startDate: "2027-01-01",
    termMode: "YEARS",
    termYears: "3",
    billingFrequency: "ANNUAL",
    legalEntityId: "7",
    netTermsDays: "30",
    securityContact: {
      mode: "salesforce",
      sfContactId: "003A",
      name: "Marco",
      title: "",
      email: "",
    },
    billingContact: {
      mode: "manual",
      sfContactId: "",
      name: " Jane ",
      title: "",
      email: "ap@x.example",
    },
    billTo: {
      ...addressFrom("001A", "Northwind", {
        street: "1 St",
        city: "Phl",
        stateProvince: null,
        postalCode: null,
        country: "USA",
      }),
    },
    shipToSameAsBillTo: true,
    specialTermsEnabled: false,
    specialTerms: "stale text that must not be sent",
    lines: [
      {
        lineId: 11,
        pricebookEntryId: "01uA",
        productName: "Gateway",
        productCode: "GW",
        productDescription: "",
        pricebookId: "01sFY26",
        pricebookName: "FY26",
        unitPrice: "360",
        category: "SUBSCRIPTION",
        categorySource: "REP",
        recurring: true,
        unitOfMeasure: "",
        quantity: "20",
        discount: "10",
      },
      {
        lineId: null,
        pricebookEntryId: "01uB",
        productName: "Portal",
        productCode: "",
        productDescription: "",
        pricebookId: "01sFY26",
        pricebookName: "FY26",
        unitPrice: "4800",
        category: "SUBSCRIPTION",
        categorySource: "REP",
        recurring: true,
        unitOfMeasure: "Portals",
        quantity: "1",
        discount: "",
      },
    ],
  };
}

describe("toDraftInput", () => {
  it("sends the Overview's primary tick, a setting of the quote (D68)", () => {
    expect(toDraftInput({ ...emptyDraftForm(), isPrimary: true }).isPrimary).toBe(true);
    expect(toDraftInput(emptyDraftForm()).isPrimary).toBe(false);
  });

  it("sends choices, never prices, and keeps saved lines' snapshots", () => {
    const input = toDraftInput(filled(), "2026-09-25T10:00:00.123Z");

    expect(input).toMatchObject({ termMode: "YEARS", termYears: 3, billingFrequency: "ANNUAL" });
    expect(input.subscriptionEndDate).toBeUndefined(); // derived by the backend
    expect(input.expectedUpdatedAt).toBe("2026-09-25T10:00:00.123Z");
    expect(input.legalEntityId).toBe(7);
    expect(input.netTermsDays).toBe(30);
    expect(input.lines[0]).toEqual({
      keepSnapshotFromLineId: 11,
      pricebookEntryId: "01uA",
      quantity: 20,
      category: "SUBSCRIPTION",
      discretionaryDiscountPercent: "10",
      unitOfMeasure: undefined,
    });
    expect(input.lines[1]).toMatchObject({
      discretionaryDiscountPercent: "0",
      keepSnapshotFromLineId: undefined,
    });
    expect(JSON.stringify(input)).not.toContain("unitPrice");
  });

  // D82: a saved line keeps its pricing; only a line the AM moved asks for the pricing in force.
  it("keeps a saved line's pricing unless the AM moved it", () => {
    const v = filled();
    const keepPricing = { method: "FORMULA" as const, formulaVersionId: 6, formula: null };
    const kept = { ...v, lines: [{ ...v.lines[0], keepPricing }] };
    expect(toDraftInput(kept).lines[0].useLatestFormula).toBeUndefined();
    expect((toPreviewBody(kept) as { lines: { keepPricing?: unknown }[] }).lines[0].keepPricing).toEqual({
      method: "FORMULA",
      formulaVersionId: 6,
    });

    const moved = { ...v, lines: [{ ...v.lines[0], keepPricing, useLatestPricing: true }] };
    expect(toDraftInput(moved).lines[0].useLatestFormula).toBe(true);
    expect((toPreviewBody(moved) as { lines: { keepPricing?: unknown }[] }).lines[0].keepPricing).toBeUndefined();
  });

  it("maps contacts, addresses and switched-off terms", () => {
    const input = toDraftInput(filled());

    expect(input.contacts.security).toEqual({ sfContactId: "003A" });
    expect(input.contacts).not.toHaveProperty("primary"); // no primary contact
    expect(input.contacts.billing).toEqual({
      name: "Jane",
      email: "ap@x.example",
      title: undefined,
    });
    expect(input.shipTo).toBeUndefined();
    expect(input.shipToSameAsBillTo).toBe(true);
    expect(input.specialTerms).toEqual({ enabled: false, text: undefined });
  });

  it("sends only the term fields each mode uses, and the billing (D85)", () => {
    const years = toDraftInput({ ...filled(), termMode: "YEARS", termYears: "2", termEndDate: "2027-06-30", billingFrequency: "MONTHLY" });
    expect(years).toMatchObject({ termMode: "YEARS", termYears: 2, subscriptionEndDate: undefined, billingFrequency: "MONTHLY" });
    const date = toDraftInput({ ...filled(), termMode: "END_DATE", termEndDate: "2028-01-01", billingFrequency: "UPFRONT" });
    expect(date).toMatchObject({ termMode: "END_DATE", termYears: undefined, subscriptionEndDate: "2028-01-01", billingFrequency: "UPFRONT" });
    expect(date).not.toHaveProperty("coTermOpportunityId");
  });

  it("sends no term when no product recurs in Salesforce (D76), but still the billing (D88)", () => {
    const v = filled();
    // Still under Subscription: the category doesn't decide.
    const input = toDraftInput({ ...v, billingFrequency: "MONTHLY", lines: v.lines.map((l) => ({ ...l, recurring: false })) });
    expect(input.termMode).toBeUndefined();
    expect(input.billingFrequency).toBe("MONTHLY");
    expect(input.subscriptionStartDate).toBe("2027-01-01");
  });

  it("drops previous opportunities when the quote is not a renewal", () => {
    const v = {
      ...filled(),
      isRenewal: false,
      previousOpportunityIds: ["006P"],
    };
    expect(toDraftInput(v).previousOpportunityIds).toEqual([]);
  });
});

describe("toPreviewBody", () => {
  it("is null until there is enough to price", () => {
    expect(toPreviewBody(emptyDraftForm())).toBeNull();
    expect(toPreviewBody({ ...filled(), billingFrequency: "" })).toBeNull();
    expect(toPreviewBody({ ...filled(), lines: [] })).toBeNull();
    expect(toPreviewBody({ ...filled(), termMode: "END_DATE", termEndDate: "" })).toBeNull();
    expect(toPreviewBody({ ...filled(), termMode: "END_DATE", termEndDate: "2037-01-01" })).toBeNull(); // over 10 years
  });

  it("prices a line waiting for its category too (D72, D76)", () => {
    const v = filled();
    const waiting = { ...v, lines: [...v.lines, { ...v.lines[0], pricebookEntryId: "01uWAIT", category: "" as const }] };
    const body = toPreviewBody(waiting) as { lines: { pricebookEntryId: string; category: string }[] };
    expect(body.lines.at(-1)).toMatchObject({ pricebookEntryId: "01uWAIT", category: "" });
    // An uncategorised recurring product still needs the term.
    expect(toPreviewBody({ ...v, termMode: "", lines: [{ ...v.lines[0], category: "" }] })).toBeNull();
  });

  it("carries the term and the lines' choices", () => {
    expect(toPreviewBody(filled())).toMatchObject({
      subscriptionEndDate: "2029-12-31",
      billingFrequency: "ANNUAL",
      lines: [{ pricebookEntryId: "01uA", quantity: 20 }, { pricebookEntryId: "01uB" }],
    });
    expect(JSON.stringify(toPreviewBody(filled()))).not.toContain("uplift");
  });

  it("prices any end date, a year and a day included, with the chosen billing (D85)", () => {
    expect(toPreviewBody({ ...filled(), termMode: "END_DATE", termEndDate: "2028-01-01", billingFrequency: "QUARTERLY" })).toMatchObject({
      subscriptionEndDate: "2028-01-01",
      billingFrequency: "QUARTERLY",
    });
  });

  it("prices a quote with no recurring product from its start date and billing (D88)", () => {
    const v = filled();
    const services = { ...v, termMode: "" as const, billingFrequency: "UPFRONT" as const, lines: v.lines.map((l) => ({ ...l, recurring: false })) };
    expect(toPreviewBody(services)).toMatchObject({ subscriptionStartDate: "2027-01-01", subscriptionEndDate: undefined, billingFrequency: "UPFRONT" });
    expect(toPreviewBody({ ...services, billingFrequency: "" })).toBeNull();
  });
});

describe("subscription term", () => {
  const term = { startDate: "2027-03-15", termYears: "4", termEndDate: "2027-09-30" };

  it("works out the end for a number of years, and takes an end date as set", () => {
    expect(termEnd({ ...term, termMode: "YEARS", termYears: "1" })).toBe("2028-03-14");
    expect(termEnd({ ...term, termMode: "YEARS" })).toBe("2031-03-14");
    expect(termEnd({ ...term, termMode: "END_DATE" })).toBe("2027-09-30");
    expect(termEnd({ ...term, termMode: "" })).toBe("");
    expect(termEnd({ ...term, startDate: "", termMode: "YEARS" })).toBe("");
  });

  it("says the duration in words, as the backend does (D85)", () => {
    expect(durationText("2027-01-01", "2027-12-31")).toBe("1 year");
    expect(durationText("2027-01-01", "2029-12-31")).toBe("3 years");
    expect(durationText("2027-01-01", "2028-01-01")).toBe("1 year + 1 day");
    expect(durationText("2027-01-01", "2027-12-30")).toBe("11 months + 30 days");
    expect(durationText("2027-01-01", "2029-03-31")).toBe("2 years + 3 months");
    expect(durationText("2027-03-05", "2027-03-05")).toBe("1 day");
    expect(durationText("2027-01-31", "2027-02-27")).toBe("1 month");
    expect(durationText("2027-03-05", "2027-03-04")).toBe("");
  });

  it("reads Salesforce's dates as whole years when they make them, else as an end date (D85)", () => {
    expect(termFromDates("2027-01-01", "2029-12-31")).toEqual({ termMode: "YEARS", termYears: "3", termEndDate: "" });
    expect(termFromDates("2027-01-01", "2028-01-01")).toEqual({ termMode: "END_DATE", termYears: "1", termEndDate: "2028-01-01" });
    expect(termFromDates("2027-01-01", null)).toEqual({ termMode: "YEARS", termYears: "1", termEndDate: "" });
    expect(termFromDates("", "2027-12-31")).toEqual({ termMode: "YEARS", termYears: "1", termEndDate: "" });
  });

  it("allows an end date from the start up to 10 years (D85)", () => {
    expect(endDateProblem("2027-03-15", "2027-09-30")).toBe("");
    expect(endDateProblem("2027-03-15", "2037-03-14")).toBe("");
    expect(endDateProblem("2027-03-15", "2037-03-15")).toMatch(/at most 10 years/);
    expect(endDateProblem("2027-03-15", "2027-03-14")).toMatch(/before the start/);
  });
});

describe("fromVersion", () => {
  it("rebuilds the form from a saved draft", () => {
    const res = {
      quote: { id: 1, sfAccountId: "001A", sfOpportunityId: "006A" },
      version: {
        accountName: "Northwind",
        opportunityName: "API 2027",
        dealType: "PARTNER",
        partner: { sfAccountId: "001P", name: "Acme", role: "Reseller" },
        legalEntityId: 7,
        isRenewal: false,
        currencyIsoCode: "USD",
        subscriptionStartDate: "2027-01-01",
        subscriptionEndDate: "2027-06-30",
        termMode: "END_DATE",
        termYears: null,
        billingFrequency: "ANNUAL",
        netTermsDays: 45,
        specialTerms: { enabled: true, text: "SLA" },
        governingTerms: { enabled: false, text: null },
        poNumber: null,
        justification: null,
        contacts: [
          {
            role: "SECURITY",
            source: "SALESFORCE",
            sfContactId: "003A",
            name: "Marco",
            title: null,
            email: null,
          },
        ],
        addresses: [
          {
            type: "BILL_TO",
            source: "SALESFORCE",
            sfAccountId: "001P",
            companyName: "Acme",
            addressLine1: "1",
            addressLine2: null,
            city: "L",
            stateProvince: null,
            postalCode: null,
            country: "UK",
            taxId: null,
          },
          {
            type: "SHIP_TO",
            source: "SAME_AS_BILL_TO",
            sfAccountId: "001P",
            companyName: "Acme",
            addressLine1: "1",
            addressLine2: null,
            city: "L",
            stateProvince: null,
            postalCode: null,
            country: "UK",
            taxId: null,
          },
        ],
        previousOpportunities: [],
        lines: [
          {
            id: 55,
            pricebookEntryId: "01uA",
            productName: "Gateway",
            productCode: null,
            pricebookId: "01sFY26",
        pricebookName: "FY26",
            unitPrice: "360",
            unitOfMeasure: null,
            quantity: 20,
            category: "SUBSCRIPTION",
            discretionaryDiscountPercent: "10.00",
            startDate: "2027-01-01",
            endDate: "2027-06-30",
          },
        ],
      },
      issues: [],
    } as unknown as DraftResponse;

    const v = fromVersion(res);

    expect(v.termMode).toBe("END_DATE");
    expect(v.termEndDate).toBe("2027-06-30");
    expect(v.billingFrequency).toBe("ANNUAL");
    expect(v.netTermsDays).toBe("45");
    expect(v.shipToSameAsBillTo).toBe(true);
    expect(v.securityContact).toMatchObject({
      mode: "salesforce",
      sfContactId: "003A",
    });
    expect(v.billingContact.mode).toBe("none");
    expect(v.lines[0]).toMatchObject({
      lineId: 55,
      discount: "10",
    });
    expect(v.partner?.name).toBe("Acme");
  });
});

describe("stepOfField", () => {
  it("sends each issue to the step that owns the field", () => {
    expect(stepOfField("legalEntityId")).toBe(0);
    expect(stepOfField("contacts.billing")).toBe(2);
    expect(stepOfField("defaultPricebookId")).toBe(1); // the price book card is on Products & Pricing
    expect(stepOfField("lines")).toBe(1);
    expect(stepOfField("lines[2].quantity")).toBe(1);
    expect(stepOfField("subscriptionStartDate")).toBe(1); // with the term (D73)
    expect(stepOfField("billingFrequency")).toBe(2); // Commercials (D86)
    expect(stepOfField("termMode")).toBe(1);
    expect(stepOfField("subscriptionEndDate")).toBe(1);
    expect(stepOfField("billTo.city")).toBe(2);
    expect(stepOfField("contacts.billing")).toBe(2);
    expect(stepOfField("netTermsDays")).toBe(2); // the Payment Terms card on Commercials (D86)
    expect(stepOfField("poNumber")).toBe(2);
    expect(stepOfField("specialTerms.billing")).toBe(2);
  });
});

describe("storedPricing", () => {
  const row = (yearNumber: number, periodStart: string, periodEnd: string, net: string, billing: string) => ({
    yearNumber, periodStart, periodEnd, yearFraction: "1.0000", gross: net, discount: "0.00", net, billing,
  });
  const res = {
    version: {
      pricingRulesVersion: "2026-09-D4",
      subscriptionStartDate: "2027-01-01",
      subscriptionEndDate: "2028-06-30",
      totals: { arr: "1000.30", acv: "1000.30", tcv: "1500.45", payableNow: "1000.30" },
      lines: [
        { pricebookEntryId: "01uA", annualList: "1000.10", annualNet: "1000.10", arr: "1000.10", tcv: "1500.15",
          schedule: [row(1, "2027-01-01", "2027-12-31", "1000.10", "1000.10"), row(2, "2028-01-01", "2028-06-30", "500.05", "500.05")] },
        { pricebookEntryId: "01uB", annualList: "0.20", annualNet: "0.20", arr: "0.20", tcv: "0.30",
          schedule: [row(1, "2027-04-01", "2027-12-31", "0.20", "0.20"), row(2, "2028-01-01", "2028-06-30", "0.10", "0.10")] },
      ],
    },
  } as unknown as DraftResponse;

  it("rebuilds the yearly schedule from the stored rows, summed exactly", () => {
    const p = storedPricing(res);
    expect(p?.totals.tcv).toBe("1500.45");
    expect(p?.years).toEqual([
      { yearNumber: 1, periodStart: "2027-01-01", periodEnd: "2027-12-31", net: "1000.30", billing: "1000.30", commission: "0.00", netBilling: "1000.30" },
      { yearNumber: 2, periodStart: "2028-01-01", periodEnd: "2028-06-30", net: "500.15", billing: "500.15", commission: "0.00", netBilling: "500.15" },
    ]);
    expect(p?.lines[1].annualNet).toBe("0.20");
  });

  it("shows a stored line waiting for its category with its amount (D75)", () => {
    const waiting = {
      version: { ...res.version, lines: [res.version.lines[0], { ...res.version.lines[1], category: "" }] },
    } as unknown as DraftResponse;
    const p = storedPricing(waiting);
    expect(p?.lines[0].tcv).toBe("1500.15");
    expect(p?.lines[1].tcv).toBe(res.version.lines[1].tcv);
  });

  it("is null when a line was stored unpriced", () => {
    const unpriced = { version: { ...res.version, lines: [{ ...res.version.lines[0], schedule: [] }] } } as unknown as DraftResponse;
    expect(storedPricing(unpriced)).toBeNull();
  });

  it("shows a services-only quote as one row at its start date", () => {
    const services = {
      version: {
        ...res.version,
        subscriptionEndDate: null,
        totals: { arr: null, acv: null, tcv: "720.00", payableNow: "720.00" },
        lines: [{ ...res.version.lines[0], category: "PROFESSIONAL_SERVICE", schedule: [row(1, "2027-01-01", "2027-01-01", "720.00", "720.00")] }],
      },
    } as unknown as DraftResponse;
    expect(storedPricing(services)?.years).toEqual([
      { yearNumber: 1, periodStart: "2027-01-01", periodEnd: "2027-01-01", net: "720.00", billing: "720.00", commission: "0.00", netBilling: "720.00" },
    ]);
  });
});

describe("submission dates", () => {
  it("adds the validity period to the UTC day", () => {
    expect(expiryFor(new Date("2026-10-01T09:30:00Z"), 30)).toBe("2026-10-31");
    // 02:00 on 1 Oct in Colombo is still 30 Sep in UTC.
    expect(expiryFor(new Date("2026-10-01T02:00:00+05:30"), 30)).toBe("2026-10-30");
    expect(expiryFor(new Date("2026-12-15T12:00:00Z"), 30)).toBe("2027-01-14");
  });

  it("treats a quote as expired only after its expiry day", () => {
    expect(isExpired("2026-10-31", new Date("2026-10-31T23:59:00Z"))).toBe(false);
    expect(isExpired("2026-10-31", new Date("2026-11-01T00:00:00Z"))).toBe(true);
    expect(isExpired(null, new Date())).toBe(false);
  });

  it("formats dates as in the approved layout", () => {
    expect(formatDate("2026-10-31")).toBe("31 Oct 2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("partner commission", () => {
  const partner = (): DraftFormValues => ({ ...filled(), dealType: "PARTNER", partnerCommissionPercent: "15" });

  it("checks the % the way the backend does", () => {
    expect(commissionProblem("")).toMatch(/Enter/);
    expect(commissionProblem("0")).toBe("");
    expect(commissionProblem("12.5")).toBe("");
    expect(commissionProblem("100")).toBe("");
    for (const bad of ["100.01", "-1", "7.125", "abc"]) expect(commissionProblem(bad)).toMatch(/0 to 100/);
  });

  it("sends the % on a partner-led quote only", () => {
    expect(toDraftInput(partner()).partnerCommissionPercent).toBe("15");
    expect(toDraftInput({ ...partner(), dealType: "DIRECT" }).partnerCommissionPercent).toBeUndefined();
    expect(toPreviewBody(partner())).toMatchObject({ partnerCommissionPercent: "15" });
    expect(toPreviewBody({ ...partner(), partnerCommissionPercent: "abc" })).toMatchObject({ partnerCommissionPercent: undefined });
    expect(toPreviewBody({ ...partner(), dealType: "DIRECT" })).toMatchObject({ partnerCommissionPercent: undefined });
  });
});

// D72: a new quote starts from its opportunity's products.
describe("pulledLines", () => {
  const entry = (id: string, isActive: boolean) => ({
    id, unitPrice: "360", currencyIsoCode: "USD", isActive, pricebook: { id: "01sUSD", name: "USD Price Book" },
  });
  it("brings in each product at 1 unit, priced from the book, with its mapped category or none yet", () => {
    const lines = pulledLines([
      { id: "01tGW", name: "WSO2 Gateway", productCode: "GW", category: "SUBSCRIPTION", recurring: true, pricebookEntries: [entry("01uGW", true)] },
      { id: "01tIS", name: "WSO2 Integrator", recurring: false, pricebookEntries: [entry("01uIS", true)] },
      { id: "01tOLD", name: "Old", pricebookEntries: [entry("01uOLD", false)] },
    ] as never);
    expect(lines.map((l) => [l.pricebookEntryId, l.quantity, l.discount, l.unitPrice, l.category, l.categorySource, l.recurring])).toEqual([
      ["01uGW", "1", "", "360", "SUBSCRIPTION", "MAPPED", true],
      ["01uIS", "1", "", "360", "", "REP", false], // recurring from Salesforce, not the category (D76)
    ]);
    expect(lines[0].pricebookName).toBe("USD Price Book");
  });
});

describe("alignPreview", () => {
  const priced = (ids: string[]) => ({ lines: ids.map((pricebookEntryId) => ({ pricebookEntryId, tcv: `tcv-${pricebookEntryId}` })) }) as never;
  const line = (pricebookEntryId: string, category: "" | "SUBSCRIPTION" = "SUBSCRIPTION") => ({ pricebookEntryId, category });

  it("puts each price back on its line, with a gap for a line waiting for its category", () => {
    const p = alignPreview(priced(["A", "C"]), [line("A"), line("B", ""), line("C")]);
    expect(p?.lines.map((l) => l?.tcv)).toEqual(["tcv-A", undefined, "tcv-C"]);
  });

  it("never shows a line another's price while the preview catches up", () => {
    // B just got its category; the preview still has A and C only.
    const p = alignPreview(priced(["A", "C"]), [line("A"), line("B"), line("C")]);
    expect(p?.lines.map((l) => l?.tcv)).toEqual(["tcv-A", undefined, "tcv-C"]); // B waits; C keeps its own

    // C removed just now; the preview still has A and C: B doesn't take C's price.
    const q = alignPreview(priced(["A", "C"]), [line("A"), line("B")]);
    expect(q?.lines.map((l) => l?.tcv)).toEqual(["tcv-A", undefined]);
  });
});
