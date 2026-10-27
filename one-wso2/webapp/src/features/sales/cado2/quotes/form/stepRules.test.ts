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
import { emptyDraftForm, fromVersion, type DraftFormValues } from "./draftForm";
import { nextHint, reachableStep, stepChecks } from "./stepRules";
import { fullPartnerQuote } from "@features/sales/cado2/quotes/testing/fixtures";

const complete = (): DraftFormValues => fromVersion({ ...fullPartnerQuote, version: { ...fullPartnerQuote.version, status: "DRAFT" } });

describe("stepChecks", () => {
  it("finds nothing missing on a complete quote, so Review is reachable", () => {
    const checks = stepChecks(complete());
    expect(checks).toEqual([[], [], []]);
    expect(reachableStep(checks)).toBe(3);
  });

  it("starts a new quote at Overview with everything to choose", () => {
    const [overview, products, commercial] = stepChecks(emptyDraftForm());
    expect(overview.map((c) => c.field)).toEqual(["sfAccountId", "sfOpportunityId", "legalEntityId"]);
    // The start date is chosen with the term (D73); the currency with the price book.
    expect(products.map((c) => c.field)).toEqual(["subscriptionStartDate", "currencyIsoCode", "lines"]);
    // Commercials opens with the payment terms (D86); no line yet, so no billing.
    expect(commercial.map((c) => c.field)).toEqual(["netTermsDays", "billTo", "shipTo", "contacts.billing"]);
    expect(reachableStep(stepChecks(emptyDraftForm()))).toBe(0);
  });

  it("blocks on Salesforce-only problems too (accepted risk)", () => {
    const v = { ...complete(), dealType: null };
    expect(stepChecks(v)[0].map((c) => c.field)).toEqual(["dealType"]);
    const noPartner = { ...complete(), partner: null };
    expect(stepChecks(noPartner)[0].map((c) => c.field)).toEqual(["partner"]);
  });

  it("stops at Overview when the account has no sales region; the sub-region is optional", () => {
    const noRegion = { ...complete(), accountSalesRegion: "" };
    expect(stepChecks(noRegion)[0].map((c) => c.field)).toEqual(["salesRegion"]);
    expect(reachableStep(stepChecks(noRegion))).toBe(0);
    expect(stepChecks({ ...complete(), accountSubRegion: "" })[0]).toEqual([]);
  });

  it("needs the ship-to address on partner deals, or when it differs from bill-to", () => {
    const direct = { ...complete(), dealType: "DIRECT" as const, shipToSameAsBillTo: true, shipTo: emptyDraftForm().shipTo };
    expect(stepChecks(direct)[2]).toEqual([]);
    expect(stepChecks({ ...direct, shipToSameAsBillTo: false })[2].map((c) => c.field)).toEqual(["shipTo"]);
    expect(stepChecks({ ...complete(), shipTo: emptyDraftForm().shipTo })[2].map((c) => c.field)).toEqual(["shipTo"]);
  });

  it("wants text for switched-on terms", () => {
    const v = { ...complete(), governingTermsEnabled: true, governingTerms: " " };
    expect(stepChecks(v)[2].map((c) => c.field)).toEqual(["governingTerms.text"]);
  });

  it("checks the subscription term on Products & Pricing", () => {
    const products = (v: Partial<DraftFormValues>) => stepChecks({ ...complete(), ...v })[1];
    expect(products({ termMode: "" }).map((c) => c.field)).toEqual(["termMode"]);
    // Billing is chosen on Commercials (D86).
    expect(products({ termMode: "YEARS", billingFrequency: "" })).toEqual([]);
    expect(products({ termMode: "YEARS", termYears: "3" })).toEqual([]);
    expect(products({ termMode: "END_DATE", termEndDate: "" })[0].message).toBe("Choose the end date");
    // Any length up to 10 years, a year and a day included (from 1 Oct 2026).
    expect(products({ termMode: "END_DATE", termEndDate: "2027-10-01" })).toEqual([]);
    expect(products({ termMode: "END_DATE", termEndDate: "2036-10-01" })[0].message).toMatch(/at most 10 years/);
  });

  // D85, D86, D88: every quote chooses its billing on Commercials, services-only included.
  it("checks the billing on Commercials, on every quote", () => {
    const step3 = (v: Partial<DraftFormValues>) => stepChecks({ ...complete(), ...v })[2];
    expect(step3({ billingFrequency: "" }).map((c) => c.field)).toEqual(["billingFrequency"]);
    const services = complete().lines.map((l) => ({ ...l, recurring: false }));
    expect(step3({ billingFrequency: "", lines: services }).map((c) => c.field)).toEqual(["billingFrequency"]);
  });

  // D86: "See Special Terms" billing points at the special terms.
  it("needs the special terms on when the billing says See Special Terms", () => {
    const step3 = (v: Partial<DraftFormValues>) => stepChecks({ ...complete(), billingFrequency: "SPECIAL_TERMS", ...v })[2];
    expect(step3({ specialTermsEnabled: false })).toEqual([
      { field: "specialTerms.billing", message: "Billing says See Special Terms: switch on special terms and describe the billing" },
    ]);
    expect(step3({ specialTermsEnabled: true, specialTerms: "40% on signing, 60% on go-live" })).toEqual([]);
    expect(step3({ specialTermsEnabled: true, specialTerms: " " }).map((c) => c.field)).toEqual(["specialTerms.text"]);
    // Services-only too (D88).
    const services = complete().lines.map((l) => ({ ...l, recurring: false }));
    expect(step3({ specialTermsEnabled: false, lines: services }).map((c) => c.field)).toEqual(["specialTerms.billing"]);
  });

  it("needs the partner's commission on a partner-led quote", () => {
    const products = (v: Partial<DraftFormValues>) => stepChecks({ ...complete(), ...v })[1];
    expect(products({ partnerCommissionPercent: "" }).map((c) => c.field)).toEqual(["partnerCommissionPercent"]);
    expect(products({ partnerCommissionPercent: "120" })[0].message).toMatch(/0 to 100/);
    expect(products({ partnerCommissionPercent: "0" })).toEqual([]);
    expect(products({ dealType: "DIRECT", partnerCommissionPercent: "" })).toEqual([]);
  });

  it("needs a category on every line brought in from Salesforce (D72)", () => {
    const v = complete();
    const lines = v.lines.map((l, i) => (i === 0 ? { ...l, category: "" as const } : l));
    expect(stepChecks({ ...v, lines })[1].map((c) => c.message)).toContain("Choose the category of 1 product");
  });

  it("needs no term when no product recurs in Salesforce (D76)", () => {
    const v = complete();
    const services = { ...v, termMode: "" as const, lines: v.lines.map((l) => ({ ...l, recurring: false })) };
    expect(stepChecks(services)[1]).toEqual([]);
  });
});

describe("reachableStep and nextHint", () => {
  it("stops at the first incomplete step, counting extra problems", () => {
    expect(reachableStep([[], [], []], [0, 2, 0])).toBe(1);
    expect(reachableStep([[], [{ field: "lines", message: "x" }], []])).toBe(1);
  });

  it("says what is missing", () => {
    expect(nextHint([])).toBe("");
    expect(nextHint([{ field: "a", message: "Choose the currency" }])).toBe("Choose the currency");
    expect(nextHint([{ field: "a", message: "Choose the currency" }, { field: "b", message: "x" }, { field: "c", message: "y" }])).toBe(
      "Choose the currency (+2 more)",
    );
  });
});
