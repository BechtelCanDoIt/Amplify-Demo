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

// The wizard's form model and its conversions. Pure functions only, so every
// mapping is unit-tested without rendering anything.
//
//   saved version ──fromVersion──▶ form values ──toDraftInput──▶ save request
//                                        └──────toPreviewBody──▶ live pricing request

import type {
  Address,
  AddressInput,
  BillingFrequency,
  CategorySource,
  ContactInput,
  DealKind,
  DealType,
  DraftInput,
  DraftResponse,
  LineCategory,
  LineFormula,
  Partner,
  PricingMethod,
  PricingPreview,
  Product,
  TermMode,
} from "@features/sales/cado2/quotes/api/quoteTypes";
import { sumMoney } from "@features/sales/cado2/utils/money";

/** Contact: none yet, a Salesforce contact of the account, or typed in. */
export interface ContactValue {
  mode: "none" | "salesforce" | "manual";
  sfContactId: string;
  name: string;
  title: string;
  email: string;
}

/** Address as the rep sees and edits it. */
export interface AddressValue {
  sfAccountId: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  taxId: string;
}

/** One line; product fields are for display and come from the price book. */
/** A saved line's pricing (D82): the price book, or a formula version with how it worked the price out. */
export interface KeptPricing {
  method: PricingMethod;
  formulaVersionId: number | null;
  formula: LineFormula | null;
}

export interface LineValue {
  /** Id of the saved line this came from; keeps its stored price. */
  lineId: number | null;
  pricebookEntryId: string;
  /** The Salesforce product: tells a formula-priced one (D81). Absent on lines from before it was kept. */
  productId?: string;
  /** How a saved line was priced (D82); absent on a new line. */
  keepPricing?: KeptPricing;
  /**
   * The AM moved this saved line to its product's pricing in force: the
   * latest formula version, or the price book (D82). Set only by the line
   * dialog; without it a saved line keeps its pricing.
   */
  useLatestPricing?: boolean;
  productName: string;
  productCode: string;
  /** The product's Salesforce description; "" when it has none. */
  productDescription: string;
  /** The line's price book; "" for lines saved before it was sent. */
  pricebookId: string;
  pricebookName: string;
  unitPrice: string;
  /** "" = a product pulled from the opportunity that waits for the AM's category (D72). */
  category: LineCategory | "";
  /** MAPPED: set by the Admin's product mapping and locked; REP: the rep chose. */
  categorySource: CategorySource;
  /**
   * Charged every year (else once), from the product's Salesforce
   * classification, as the backend says (D76). The category only places the
   * line in an order-form section.
   */
  recurring: boolean;
  unitOfMeasure: string;
  quantity: string;
  discount: string;
}

/** Term lengths the AM can choose by number of years (D85). */
export const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** The billing choices, in the order shown (D85, D86). */
export const BILLING_OPTIONS: readonly BillingFrequency[] = ["MONTHLY", "QUARTERLY", "ANNUAL", "UPFRONT", "SPECIAL_TERMS"];

export interface DraftFormValues {
  // Step 1 — the quote's identity is fixed after the first save (UI choice 3).
  accountId: string;
  accountName: string;
  accountAddress: Address | null;
  /** From Salesforce: required to quote (approvals will route on it). "" = none. */
  accountSalesRegion: string;
  /** From Salesforce; optional. "" = none. */
  accountSubRegion: string;
  opportunityId: string;
  opportunityName: string;
  /** The opportunity's primary quote, synced to Salesforce (D68): a setting of the quote. */
  isPrimary: boolean;
  dealType: DealType | null;
  partner: Pick<Partner, "id" | "name" | "role" | "billingAddress"> | null;
  /**
   * What Salesforce's record type says the deal is, shown read-only;
   * "" before an opportunity is chosen. isRenewal follows it.
   */
  dealKind: DealKind | "";
  recordTypeName: string;
  isRenewal: boolean;
  previousOpportunityIds: string[];
  legalEntityId: string;
  currencyIsoCode: string;
  /** The quote's price book; "" until the rep chooses. New lines are priced from it by default. */
  defaultPricebookId: string;
  defaultPricebookName: string;
  /** Every quote has a start date. */
  startDate: string;
  // Step 2 — the Subscription term card; only used when a line recurs.
  // "" = a saved draft with no mode yet.
  termMode: TermMode | "";
  /** Number of years: 1–10. */
  termYears: string;
  /** End date: the term's end, pre-filled from Salesforce or set by the AM. */
  termEndDate: string;
  /** The opportunity's products that couldn't be brought in, and why (D72). Shown once; never saved. */
  notBroughtIn: readonly { readonly productName: string; readonly reason: string }[];
  /** With a recurring line (D85); annually in advance unless changed. */
  billingFrequency: BillingFrequency | "";
  /** Partner-led quotes only: the partner's commission %, "" until entered. */
  partnerCommissionPercent: string;
  lines: LineValue[];
  // Step 3
  netTermsDays: "" | "30" | "45" | "60";
  poNumber: string;
  specialTermsEnabled: boolean;
  specialTerms: string;
  governingTermsEnabled: boolean;
  governingTerms: string;
  billTo: AddressValue;
  shipTo: AddressValue;
  shipToSameAsBillTo: boolean;
  billingContact: ContactValue;
  securityContact: ContactValue;
  justification: string;
}

export const emptyContact: ContactValue = {
  mode: "none",
  sfContactId: "",
  name: "",
  title: "",
  email: "",
};

export const emptyAddress: AddressValue = {
  sfAccountId: "",
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateProvince: "",
  postalCode: "",
  country: "",
  taxId: "",
};

export function emptyDraftForm(): DraftFormValues {
  return {
    accountId: "",
    accountName: "",
    accountAddress: null,
    accountSalesRegion: "",
    accountSubRegion: "",
    opportunityId: "",
    opportunityName: "",
    isPrimary: false,
    dealType: null,
    partner: null,
    dealKind: "",
    recordTypeName: "",
    isRenewal: false,
    previousOpportunityIds: [],
    legalEntityId: "",
    currencyIsoCode: "",
    defaultPricebookId: "",
    defaultPricebookName: "",
    startDate: "",
    termMode: "YEARS", // 1 year until Salesforce or the AM says otherwise (D85)
    termYears: "1",
    termEndDate: "",
    notBroughtIn: [],
    billingFrequency: "ANNUAL",
    partnerCommissionPercent: "",
    lines: [],
    netTermsDays: "",
    poNumber: "",
    specialTermsEnabled: false,
    specialTerms: "",
    governingTermsEnabled: false,
    governingTerms: "",
    billTo: { ...emptyAddress },
    shipTo: { ...emptyAddress },
    shipToSameAsBillTo: false,
    billingContact: { ...emptyContact },
    securityContact: { ...emptyContact },
    justification: "",
  };
}

// ---------------------------------------------------------------------------
// Dates (local calendar dates as "YYYY-MM-DD"; never through toISOString,
// which is UTC and shifts the day near midnight)
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a local Date as "YYYY-MM-DD". */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses "YYYY-MM-DD" as a local Date, or null. */
export function parseDateString(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toDateString(d) === s ? d : null;
}

/**
 * End date of a term of `years` starting on `start`: the day before the
 * anniversary (1 Jan 2027 + 3 years → 31 Dec 2029). A 29 Feb start rolls to
 * 28 Feb, matching the backend's month-end clamping.
 */
export function endDateFor(start: string, years: number): string {
  const d = parseDateString(start);
  if (!d) return "";
  const anniversary = new Date(d.getFullYear() + years, d.getMonth(), 1);
  const lastDay = new Date(anniversary.getFullYear(), anniversary.getMonth() + 1, 0).getDate();
  anniversary.setDate(Math.min(d.getDate(), lastDay));
  anniversary.setDate(anniversary.getDate() - 1);
  return toDateString(anniversary);
}

// ---------------------------------------------------------------------------
// Subscription term
// ---------------------------------------------------------------------------

/** Lines with a discount above 0%; any makes the justification required. */
export const discountedLines = (lines: readonly { discount: string }[]) => lines.filter((l) => Number(l.discount) > 0).length;

/** The line categories, as the AM chooses them (D46, D72). */
export const LINE_CATEGORIES: readonly { value: LineCategory; label: string }[] = [
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "SUPPORT", label: "Support" },
  { value: "PROFESSIONAL_SERVICE", label: "Professional Service" },
];

/** Subscription and Support lines repeat yearly; a Professional Service doesn't. */


/** Whether the quote needs a subscription term: any recurring line. */
/** Whether any line is charged every year, so a subscription term is needed (D37, D76). */
export const hasRecurring = (lines: readonly { readonly recurring: boolean }[]) => lines.some((l) => l.recurring);

/** The longest term: the latest end date a start allows (10 years, D85). */
export const latestEndDate = (start: string) => endDateFor(start, YEAR_OPTIONS[YEAR_OPTIONS.length - 1]);

/** Why an End date term is not allowed, or "" when it is (D85): not before the start, at most 10 years. */
export function endDateProblem(start: string, end: string): string {
  if (!start || !end) return "";
  if (end < start) return "The end date must not be before the start date";
  if (end > latestEndDate(start)) return `The term can be at most 10 years: end by ${formatDate(latestEndDate(start))}`;
  return "";
}

/** `start` moved by whole months, the day clamped to the month's last (as the backend counts). */
function addMonths(start: Date, months: number): Date {
  const first = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(start.getDate(), last));
}

/**
 * How long a term is, both days included, in words (D85), exactly as the
 * backend says it: "1 year", "3 years", "1 year + 1 day", "11 months + 30
 * days", "2 years + 3 months". "" when a date is missing or the end is before the start.
 */
export function durationText(start: string, end: string): string {
  const d = durationParts(start, end);
  if (!d) return "";
  const part = (n: number, unit: string) => (n === 1 ? `1 ${unit}` : n > 1 ? `${n} ${unit}s` : "");
  return [part(d.years, "year"), part(d.months, "month"), part(d.days, "day")].filter(Boolean).join(" + ");
}

/** The same duration, short, for the products table's Term column (D94, D96): "1Y 1M 1D", "3Y", "11M 30D". */
export function durationShort(start: string, end: string): string {
  const d = durationParts(start, end);
  if (!d) return "";
  return [d.years && `${d.years}Y`, d.months && `${d.months}M`, d.days && `${d.days}D`].filter(Boolean).join(" ");
}

/** Whole years, then whole months, then days, from the start to the end (both inclusive). */
function durationParts(start: string, end: string): { years: number; months: number; days: number } | null {
  const s = parseDateString(start);
  const e = parseDateString(end);
  if (!s || !e || e < s) return null;
  const whole = (months: number) => {
    const last = addMonths(s, months);
    last.setDate(last.getDate() - 1);
    return last <= e;
  };
  let years = 0;
  while (whole(12 * (years + 1))) years++;
  let months = 0;
  while (months < 11 && whole(12 * years + months + 1)) months++;
  const from = addMonths(s, 12 * years + months);
  const days = Math.round((e.getTime() - from.getTime()) / 86_400_000) + 1;
  return { years, months, days };
}

/**
 * The term Salesforce's dates describe (D85): a whole number of years (1–10)
 * when they make one, else the end date as it is; 1 year when there is no end.
 */
export function termFromDates(
  start: string,
  end: string | null | undefined,
): Pick<DraftFormValues, "termMode" | "termYears" | "termEndDate"> {
  if (start && end && parseDateString(end)) {
    const years = YEAR_OPTIONS.find((n) => endDateFor(start, n) === end);
    if (years) return { termMode: "YEARS", termYears: String(years), termEndDate: "" };
    return { termMode: "END_DATE", termYears: "1", termEndDate: end };
  }
  return { termMode: "YEARS", termYears: "1", termEndDate: "" };
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

/** Splits a Salesforce street: line 1 = first line, line 2 = the rest (UI choice 2). */
export function splitStreet(street: string | null | undefined): [string, string] {
  const lines = (street ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return [lines[0] ?? "", lines.slice(1).join(", ")];
}

/** Pre-fills an address from a Salesforce account (the rep can edit it). */
export function addressFrom(sfAccountId: string, companyName: string, a: Address | null): AddressValue {
  const [line1, line2] = splitStreet(a?.street);
  return {
    ...emptyAddress,
    sfAccountId,
    companyName,
    addressLine1: line1,
    addressLine2: line2,
    city: a?.city ?? "",
    stateProvince: a?.stateProvince ?? "",
    postalCode: a?.postalCode ?? "",
    country: a?.country ?? "",
  };
}

// ---------------------------------------------------------------------------
// Saved version → form
// ---------------------------------------------------------------------------

function contactFrom(res: DraftResponse, role: "BILLING" | "SECURITY"): ContactValue {
  const c = res.version.contacts.find((x) => x.role === role);
  if (!c) return { ...emptyContact };
  return {
    mode: c.source === "SALESFORCE" ? "salesforce" : "manual",
    sfContactId: c.sfContactId ?? "",
    name: c.name,
    title: c.title ?? "",
    email: c.email ?? "",
  };
}

function addressFromView(res: DraftResponse, type: "BILL_TO" | "SHIP_TO"): AddressValue {
  const a = res.version.addresses.find((x) => x.type === type);
  if (!a) return { ...emptyAddress };
  return {
    sfAccountId: a.sfAccountId ?? "",
    companyName: a.companyName,
    addressLine1: a.addressLine1 ?? "",
    addressLine2: a.addressLine2 ?? "",
    city: a.city ?? "",
    stateProvince: a.stateProvince ?? "",
    postalCode: a.postalCode ?? "",
    country: a.country ?? "",
    taxId: a.taxId ?? "",
  };
}

/** Form values for a saved draft. */
export function fromVersion(res: DraftResponse): DraftFormValues {
  const v = res.version;
  const start = v.subscriptionStartDate ?? "";
  const end = v.subscriptionEndDate ?? "";
  const shipTo = res.version.addresses.find((a) => a.type === "SHIP_TO");
  return {
    ...emptyDraftForm(),
    accountId: res.quote.sfAccountId,
    isPrimary: res.quote.isPrimary,
    accountName: v.accountName ?? "",
    accountSalesRegion: v.accountSalesRegion ?? "",
    accountSubRegion: v.accountSubRegion ?? "",
    opportunityId: res.quote.sfOpportunityId,
    opportunityName: v.opportunityName ?? "",
    dealType: v.dealType,
    partner: v.partner
      ? {
          id: v.partner.sfAccountId,
          name: v.partner.name,
          role: v.partner.role,
          billingAddress: null,
        }
      : null,
    dealKind: v.dealKind,
    recordTypeName: v.opportunityRecordType ?? "",
    isRenewal: v.isRenewal,
    previousOpportunityIds: v.previousOpportunities.map((p) => p.sfOpportunityId),
    legalEntityId: v.legalEntityId ? String(v.legalEntityId) : "",
    currencyIsoCode: v.currencyIsoCode ?? "",
    defaultPricebookId: v.defaultPricebook?.id ?? "",
    defaultPricebookName: v.defaultPricebook?.name ?? "",
    startDate: start,
    // A draft with no recurring line has no mode; it gets 1 year if a
    // recurring product is added (D85).
    termMode: v.termMode ?? (hasRecurring(v.lines) ? "" : "YEARS"),
    termYears: String(v.termYears ?? 1),
    termEndDate: v.termMode === "END_DATE" ? end : "",
    billingFrequency: v.billingFrequency ?? "ANNUAL",
    partnerCommissionPercent: v.partnerCommissionPercent ? String(Number(v.partnerCommissionPercent)) : "",
    lines: v.lines.map((l) => ({
      lineId: l.id,
      pricebookEntryId: l.pricebookEntryId,
      productId: l.sfProductId,
      keepPricing: {
        method: l.pricingMethod ?? "PRICE_BOOK",
        formulaVersionId: l.formula?.versionId ?? null,
        formula: l.formula ?? null,
      },
      productName: l.productName,
      productCode: l.productCode ?? "",
      productDescription: l.productDescription ?? "",
      pricebookId: l.pricebookId ?? "",
      pricebookName: l.pricebookName,
      unitPrice: l.unitPrice,
      category: l.category,
      categorySource: l.categorySource ?? "REP",
      recurring: l.recurring,
      unitOfMeasure: l.unitOfMeasure ?? "",
      quantity: String(l.quantity),
      discount: String(Number(l.discretionaryDiscountPercent)),
    })),
    netTermsDays: (["30", "45", "60"] as const).find((n) => String(v.netTermsDays) === n) ?? "",
    poNumber: v.poNumber ?? "",
    specialTermsEnabled: v.specialTerms.enabled,
    specialTerms: v.specialTerms.text ?? "",
    governingTermsEnabled: v.governingTerms.enabled,
    governingTerms: v.governingTerms.text ?? "",
    billTo: addressFromView(res, "BILL_TO"),
    shipTo: addressFromView(res, "SHIP_TO"),
    shipToSameAsBillTo: shipTo?.source === "SAME_AS_BILL_TO",
    billingContact: contactFrom(res, "BILLING"),
    securityContact: contactFrom(res, "SECURITY"),
    justification: v.justification ?? "",
  };
}

// ---------------------------------------------------------------------------
// Form → requests
// ---------------------------------------------------------------------------

const opt = (s: string) => (s.trim() ? s.trim() : undefined);

function contactInput(c: ContactValue): ContactInput | undefined {
  if (c.mode === "salesforce" && c.sfContactId) return { sfContactId: c.sfContactId };
  if (c.mode === "manual" && (c.name.trim() || c.email.trim())) {
    return { name: opt(c.name), email: opt(c.email), title: opt(c.title) };
  }
  return undefined;
}

function addressInput(a: AddressValue): AddressInput | undefined {
  const out: AddressInput = {
    sfAccountId: opt(a.sfAccountId),
    companyName: opt(a.companyName),
    addressLine1: opt(a.addressLine1),
    addressLine2: opt(a.addressLine2),
    city: opt(a.city),
    stateProvince: opt(a.stateProvince),
    postalCode: opt(a.postalCode),
    country: opt(a.country),
    taxId: opt(a.taxId),
  };
  return Object.values(out).some((v) => v !== undefined && v !== out.sfAccountId) ? out : undefined;
}

/**
 * The term's end date: worked out for a number of years, as set for an end
 * date. "" when there is no term yet, or none is needed.
 */
export function termEnd(v: Pick<DraftFormValues, "startDate" | "termMode" | "termYears" | "termEndDate">): string {
  if (!v.startDate) return "";
  switch (v.termMode) {
    case "YEARS":
      return endDateFor(v.startDate, Number(v.termYears));
    case "END_DATE":
      return v.termEndDate;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Partner commission
// ---------------------------------------------------------------------------

/** Whether the quote is partner-led, so a commission applies. */
export const isPartnerLed = (v: Pick<DraftFormValues, "dealType">) => v.dealType === "PARTNER";

/** Why a commission % is not allowed, or "" when it is: 0–100, at most 2 decimals. */
export function commissionProblem(value: string): string {
  const s = value.trim();
  if (!s) return "Enter the partner's commission (0 if none)";
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s) || Number(s) > 100) return "Use 0 to 100, with at most 2 decimals";
  return "";
}

/** The commission to send: only on a partner-led quote, and only once valid. */
function commissionInput(v: DraftFormValues): string | undefined {
  return isPartnerLed(v) && !commissionProblem(v.partnerCommissionPercent) ? v.partnerCommissionPercent.trim() : undefined;
}

/** The term fields of a request, for the mode in use (none without a recurring line), and the billing (every quote, D88). */
function termInput(v: DraftFormValues) {
  const billingFrequency = v.billingFrequency || undefined;
  if (!hasRecurring(v.lines)) return { billingFrequency };
  return {
    termMode: v.termMode || undefined,
    termYears: v.termMode === "YEARS" ? Number(v.termYears) : undefined,
    subscriptionEndDate: v.termMode === "END_DATE" ? opt(v.termEndDate) : undefined,
    billingFrequency,
  };
}

/** The save request body. */
export function toDraftInput(v: DraftFormValues, expectedUpdatedAt?: string): DraftInput {
  return {
    sfOpportunityId: v.opportunityId,
    sfAccountId: v.accountId,
    expectedUpdatedAt,
    isPrimary: v.isPrimary,
    previousOpportunityIds: v.isRenewal ? v.previousOpportunityIds : [],
    legalEntityId: v.legalEntityId ? Number(v.legalEntityId) : undefined,
    currencyIsoCode: opt(v.currencyIsoCode),
    defaultPricebookId: opt(v.defaultPricebookId),
    subscriptionStartDate: opt(v.startDate),
    ...termInput(v),
    partnerCommissionPercent: isPartnerLed(v) ? opt(v.partnerCommissionPercent) : undefined,
    netTermsDays: v.netTermsDays ? Number(v.netTermsDays) : undefined,
    specialTerms: {
      enabled: v.specialTermsEnabled,
      text: v.specialTermsEnabled ? opt(v.specialTerms) : undefined,
    },
    governingTerms: {
      enabled: v.governingTermsEnabled,
      text: v.governingTermsEnabled ? opt(v.governingTerms) : undefined,
    },
    poNumber: opt(v.poNumber),
    justification: opt(v.justification),
    contacts: {
      billing: contactInput(v.billingContact),
      security: contactInput(v.securityContact),
    },
    billTo: addressInput(v.billTo),
    shipTo: v.shipToSameAsBillTo ? undefined : addressInput(v.shipTo),
    shipToSameAsBillTo: v.shipToSameAsBillTo,
    lines: v.lines.map((l) => ({
      keepSnapshotFromLineId: l.lineId ?? undefined,
      pricebookEntryId: l.pricebookEntryId,
      quantity: Number(l.quantity),
      category: l.category,
      discretionaryDiscountPercent: l.discount.trim() || "0",
      unitOfMeasure: opt(l.unitOfMeasure),
      // A saved line the AM moved to the pricing in force (D82).
      useLatestFormula: l.lineId !== null && l.useLatestPricing ? true : undefined,
    })),
  };
}

/**
 * The live-pricing request, or null until there is enough to price: a start
 * date, a currency and at least one line — plus, when a line recurs, a valid
 * term and a billing frequency.
 */
export function toPreviewBody(v: DraftFormValues): object | null {
  // Every line, a line waiting for its category included: it is priced once, like a service (D75, WIP for multi-year).
  const lines = v.lines;
  if (!v.startDate || !v.currencyIsoCode || lines.length === 0) return null;
  const recurring = hasRecurring(v.lines);
  const end = termEnd(v);
  const billing = v.billingFrequency;
  if (!billing || (recurring && (!end || endDateProblem(v.startDate, end)))) return null;
  return {
    currencyIsoCode: v.currencyIsoCode,
    subscriptionStartDate: v.startDate,
    subscriptionEndDate: recurring ? end : undefined,
    billingFrequency: billing,
    partnerCommissionPercent: commissionInput(v),
    lines: lines.map((l) => ({
      pricebookEntryId: l.pricebookEntryId,
      quantity: Number(l.quantity),
      category: l.category,
      discretionaryDiscountPercent: l.discount.trim() || "0",
      keepPricing:
        l.keepPricing && !l.useLatestPricing
          ? { method: l.keepPricing.method, formulaVersionId: l.keepPricing.formulaVersionId }
          : undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Stored pricing and submission dates
// ---------------------------------------------------------------------------

/**
 * The pricing as stored on a version, in the live preview's shape, so a
 * submitted version always shows its frozen numbers (never re-priced with
 * today's rules). Year boundaries follow the term; each year's amounts are
 * the exact sums of its line rows. Null if the version has no priced lines.
 */
export function storedPricing(res: DraftResponse): PricingPreview | null {
  const v = res.version;
  const start = v.subscriptionStartDate;
  // A services-only quote has no end date: its one "year" is the start day.
  const end = v.subscriptionEndDate ?? (hasRecurring(v.lines) ? null : start);
  // Every line is priced, a line waiting for its category included (D75); one
  // unpriced (e.g. saved before D75) means the quote isn't priced.
  const pricedLines = v.lines;
  if (!start || !end || pricedLines.length === 0 || pricedLines.some((l) => l.schedule.length === 0)) return null;
  const yearCount = Math.max(...pricedLines.flatMap((l) => l.schedule.map((r) => r.yearNumber)));
  const years = [];
  for (let n = 1; n <= yearCount; n++) {
    const rows = v.lines.flatMap((l) => l.schedule.filter((r) => r.yearNumber === n));
    const yearEnd = endDateFor(start, n);
    years.push({
      yearNumber: n,
      periodStart: n === 1 ? start : dayAfter(endDateFor(start, n - 1)),
      periodEnd: yearEnd < end ? yearEnd : end,
      net: sumMoney(rows.map((r) => r.net)),
      billing: sumMoney(rows.map((r) => r.billing)),
      commission: sumMoney(rows.map((r) => r.commission ?? "0.00")),
      netBilling: sumMoney(rows.map((r) => r.netBilling ?? r.billing)),
    });
  }
  return {
    rulesVersion: v.pricingRulesVersion,
    termMonths: "",
    totals: v.totals,
    years,
    // Aligned with the version's lines, one for one (a line waiting for its category is priced too, D75).
    lines: v.lines.map((l) => ({
      pricebookEntryId: l.pricebookEntryId,
      annualList: l.annualList,
      annualNet: l.annualNet,
      arr: l.arr,
      tcv: l.tcv,
      commission: l.commission,
      schedule: l.schedule,
    })),
  };
}

/**
 * Lines the live preview's prices up with the form's lines, product by product
 * in order, leaving a gap where the preview hasn't caught up with a change yet,
 * so no line shows another's amount.
 */
export function alignPreview(
  p: PricingPreview | null,
  lines: readonly { readonly category: LineCategory | ""; readonly pricebookEntryId: string }[],
): PricingPreview | null {
  if (!p) return null;
  let k = 0;
  const aligned = lines.map((l) => {
    const next = p.lines[k];
    if (!next || next.pricebookEntryId !== l.pricebookEntryId) return undefined;
    k++;
    return next;
  });
  return { ...p, lines: aligned as unknown as PricingPreview["lines"] };
}

function dayAfter(date: string): string {
  const d = parseDateString(date);
  if (!d) return "";
  d.setDate(d.getDate() + 1);
  return toDateString(d);
}

/**
 * The expiry date a submission made at `now` would get: the UTC
 * calendar day, plus the validity period. Mirrors the backend rule so
 * the submit dialog can show it beforehand.
 */
export function expiryFor(now: Date, validityDays: number): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + validityDays));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Whether a quote with this expiry date has expired, judged by the UTC day. */
export function isExpired(expiryDate: string | null, now: Date): boolean {
  return expiryDate !== null && expiryFor(now, 0) > expiryDate;
}

/** "2026-10-31" → "31 Oct 2026", as in the approved layout. */
export function formatDate(date: string | null): string {
  const d = date ? parseDateString(date) : null;
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

/** A moment, "3 Oct 2026, 09:00", in the viewer's time zone: the one date-time format (D14, 2026-10-14). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Who last changed something, "3 Oct 2026 · admin@wso2.com": the one style (D15, 2026-10-14). */
export function changedText(at: string, by: string | null): string {
  const day = formatDate(at.slice(0, 10));
  return by ? `${day} · ${by}` : day;
}

/** The billing choice, in the same words everywhere (D85), the order form included. */
export const BILLING_LABEL: Record<BillingFrequency, string> = {
  MONTHLY: "Monthly in Advance",
  QUARTERLY: "Quarterly in Advance",
  ANNUAL: "Annually in Advance",
  UPFRONT: "Upon the Execution of the Order Form",
  SPECIAL_TERMS: "See Special Terms",
};

// ---------------------------------------------------------------------------
// Issues → wizard steps
// ---------------------------------------------------------------------------

/** Wizard steps, in order. */
export const STEPS = ["Overview", "Products & Pricing", "Commercials", "Review"] as const;

/** Fields on Products & Pricing besides the lines: currency and price book, the start date and term, commission. */
const STEP_2_FIELDS = [
  // The start date is on step 2 with the term (D73).
  "subscriptionStartDate",
  "currencyIsoCode",
  "defaultPricebookId",
  "termMode",
  "termYears",
  "subscriptionEndDate",
  "partnerCommissionPercent",
];

/** Commercials (D86): billing and payment terms first. */
const STEP_3_FIELDS = [
  "billingFrequency",
  "netTermsDays",
  "poNumber",
  "specialTerms",
  "governingTerms",
  "billTo",
  "shipTo",
  "contacts.billing",
  "contacts.security",
  "justification",
];

/** The step (0-based) where an issue's field lives, so the summary panel can jump there. */
export function stepOfField(field: string): number {
  // "salesforce": a refused sync (D77), done from Products & Pricing.
  if (field === "lines" || field.startsWith("lines[") || field === "salesforce" || STEP_2_FIELDS.includes(field)) return 1;
  if (STEP_3_FIELDS.some((f) => field === f || field.startsWith(f + ".") || field.startsWith(f + "["))) return 2;
  return 0;
}

/**
 * The lines a new quote starts with (D72): one per product on the Salesforce
 * opportunity, priced from the price book, 1 unit each (the AM changes it), no
 * discount, the Admin's category if mapped, else "" for the AM to choose.
 */
export function pulledLines(products: readonly Product[]): LineValue[] {
  return products.flatMap((p) => {
    const entry = p.pricebookEntries.find((e) => e.isActive);
    if (!entry) return [];
    return [
      {
        lineId: null,
        pricebookEntryId: entry.id,
        productId: p.id,
        productName: p.name ?? p.id,
        productCode: p.productCode ?? "",
        productDescription: p.description ?? "",
        pricebookId: entry.pricebook?.id ?? "",
        pricebookName: entry.pricebook?.name ?? "",
        unitPrice: entry.unitPrice ?? "",
        category: p.category ?? "",
        categorySource: p.category ? "MAPPED" : "REP",
        recurring: p.recurring,
        unitOfMeasure: "",
        quantity: "1",
        discount: "",
      } satisfies LineValue,
    ];
  });
}
