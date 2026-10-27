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

// salesforceBaseUrl is read once, when apiConfig loads, so each case loads it fresh.
async function withBase(base: string | undefined) {
  vi.resetModules();
  window.config = { ...(window.config ?? {}), ONE_WSO2_SALESFORCE_BASE_URL: base } as Window["config"];
  return import("./salesforceLinks");
}

describe("salesforceRecordUrl", () => {
  it("links to the Lightning record page", async () => {
    const { salesforceRecordUrl } = await withBase("https://wso2.lightning.force.com/");
    expect(salesforceRecordUrl("Account", "001VM00000ABCDEAA4")).toBe(
      "https://wso2.lightning.force.com/lightning/r/Account/001VM00000ABCDEAA4/view",
    );
    expect(salesforceRecordUrl("Contact", "003VM00000CONTAC1A")).toBe(
      "https://wso2.lightning.force.com/lightning/r/Contact/003VM00000CONTAC1A/view",
    );
  });

  it("uses WSO2's own Lightning host when the key is unset", async () => {
    const { salesforceRecordUrl } = await withBase(undefined);
    expect(salesforceRecordUrl("Opportunity", "006VM00000O4AUSYA3")).toBe(
      "https://wso2.lightning.force.com/lightning/r/Opportunity/006VM00000O4AUSYA3/view",
    );
  });

  it("gives no link for a non-https base or something that isn't a Salesforce id", async () => {
    const insecure = await withBase("http://insecure.example");
    expect(insecure.salesforceRecordUrl("Account", "001VM00000ABCDEAA4")).toBeNull();
    const { salesforceRecordUrl } = await withBase("https://wso2.lightning.force.com");
    expect(salesforceRecordUrl("Account", "not an id")).toBeNull();
    expect(salesforceRecordUrl("Account", null)).toBeNull();
  });
});
