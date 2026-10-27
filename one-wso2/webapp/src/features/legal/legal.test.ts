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
import { formatCustomerAddress } from "./api/useCustomerSearch";
import { NDA_ENTITY_CONFIGS, entityForCountry } from "./pages/NdaPdfDocument";

describe("entityForCountry", () => {
  it("maps a billing country to its WSO2 entity, by name or ISO code, ignoring case", () => {
    expect(entityForCountry("Sri Lanka")).toBe("WSO2 Lanka (Pvt) Ltd — LK");
    expect(entityForCountry("united states")).toBe("WSO2 LLC — US");
    expect(entityForCountry(" GB ")).toBe("WSO2 (UK) Ltd — UK");
  });

  it("returns empty when no entity serves the country, so the user must choose", () => {
    expect(entityForCountry("France")).toBe("");
    expect(entityForCountry(null)).toBe("");
    expect(entityForCountry("")).toBe("");
  });

  it("never claims one country for two entities", () => {
    const all = Object.values(NDA_ENTITY_CONFIGS).flatMap((cfg) => cfg.countries.map((c) => c.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives every entity at least one country", () => {
    for (const [key, cfg] of Object.entries(NDA_ENTITY_CONFIGS)) {
      expect(cfg.countries.length, key).toBeGreaterThan(0);
      expect(entityForCountry(cfg.countries[0]), key).toBe(key);
    }
  });
});

describe("formatCustomerAddress", () => {
  const empty = { billingStreet: null, billingCity: null, billingState: null, billingPostalCode: null, billingCountry: null };

  it("returns empty for a missing or all-null address", () => {
    expect(formatCustomerAddress(null)).toBe("");
    expect(formatCustomerAddress(empty)).toBe("");
  });

  it("joins the parts, with state and postcode sharing one part", () => {
    expect(
      formatCustomerAddress({
        billingStreet: "1 Main St",
        billingCity: "Austin",
        billingState: "TX",
        billingPostalCode: "78759",
        billingCountry: "United States",
      }),
    ).toBe("1 Main St, Austin, TX 78759, United States");
  });

  it("keeps a lone state or postcode without stray separators", () => {
    expect(formatCustomerAddress({ ...empty, billingCity: "Colombo", billingState: "WP" })).toBe("Colombo, WP");
    expect(formatCustomerAddress({ ...empty, billingCity: "Colombo", billingPostalCode: "00400" })).toBe("Colombo, 00400");
  });
});
