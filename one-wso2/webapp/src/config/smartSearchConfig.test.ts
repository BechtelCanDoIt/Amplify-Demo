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

import { afterEach, describe, expect, it, vi } from "vitest";

async function loadWith(config: Record<string, unknown> | undefined) {
  vi.resetModules();
  (window as unknown as { config?: Record<string, unknown> }).config = config;
  return import("@config/apiConfig");
}

afterEach(() => {
  delete (window as { config?: unknown }).config;
});

describe("the Smart Search backend", () => {
  it("is not configured when the key is missing, blank, or there is no config at all", async () => {
    for (const config of [undefined, {}, { ONE_WSO2_SMART_SEARCH_BACKEND_URL: "" }]) {
      expect((await loadWith(config)).isSmartSearchBackendConfigured()).toBe(false);
    }
  });

  it("is configured once its URL is set, and drops trailing slashes", async () => {
    const c = await loadWith({ ONE_WSO2_SMART_SEARCH_BACKEND_URL: "https://api.example.com/pitstop/v1.0//" });
    expect(c.isSmartSearchBackendConfigured()).toBe(true);
    expect(c.smartSearchBackendUrl).toBe("https://api.example.com/pitstop/v1.0");
  });

  it("builds the search URL, encoding the query by hand", async () => {
    const c = await loadWith({ ONE_WSO2_SMART_SEARCH_BACKEND_URL: "https://api.example.com/pitstop/v1.0" });
    const url = c.smartSearchServiceUrls.search("pricing, discounts & terms?", false);
    expect(url).toBe(
      "https://api.example.com/pitstop/v1.0/smart-search?userQuery=pricing%2C%20discounts%20%26%20terms%3F&includeAnswer=false",
    );
    expect(url).not.toContain(",");
  });

  it("asks for the answer too when includeAnswer is true", async () => {
    const c = await loadWith({ ONE_WSO2_SMART_SEARCH_BACKEND_URL: "https://api.example.com/pitstop/v1.0" });
    expect(c.smartSearchServiceUrls.search("wso2con", true)).toMatch(/&includeAnswer=true$/);
  });
});

// One WSO2 goes to production every week, and the Library is not finished. It must stay hidden in
// every environment, staging included, until an environment's config.js turns it on by name.
describe("the smartSearch preview flag", () => {
  const enabled = async (config: Record<string, unknown> | undefined): Promise<boolean> => {
    vi.resetModules();
    (window as unknown as { config?: Record<string, unknown> }).config = config;
    return (await import("@config/previewFeatures")).isPreviewEnabled("smartSearch");
  };

  it("is off when nothing is configured at all", async () => {
    expect(await enabled(undefined)).toBe(false);
    expect(await enabled({})).toBe(false);
    expect(await enabled({ ONE_WSO2_PREVIEW_FEATURES: {} })).toBe(false);
  });

  it("is off when it is set to false, or to anything that is not exactly true", async () => {
    for (const value of [false, "true", 1, "yes", null]) {
      expect(await enabled({ ONE_WSO2_PREVIEW_FEATURES: { smartSearch: value } })).toBe(false);
    }
  });

  it("is off when only the backend URL is set: the address alone never shows the Library", async () => {
    expect(await enabled({ ONE_WSO2_SMART_SEARCH_BACKEND_URL: "https://api.example.com/pitstop/v1.0" })).toBe(false);
  });

  it("is off when other features are on", async () => {
    expect(await enabled({ ONE_WSO2_PREVIEW_FEATURES: { cado2: true, nda: true } })).toBe(false);
  });

  it("is on only when this environment says so by name", async () => {
    expect(await enabled({ ONE_WSO2_PREVIEW_FEATURES: { smartSearch: true } })).toBe(true);
  });
});
