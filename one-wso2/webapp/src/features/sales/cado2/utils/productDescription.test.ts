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
import { descriptionAfterName } from "./productDescription";

describe("descriptionAfterName", () => {
  const name = "WSO2 API Control Plane (Managed, Self-hosted) - API Platform";

  it("leaves out the name when the description repeats it", () => {
    expect(descriptionAfterName(name, `${name}. Based on the number of Managed Distinct APIs.`)).toBe(
      "Based on the number of Managed Distinct APIs.",
    );
    expect(descriptionAfterName("WSO2 Gateway", "wso2 gateway - per gateway")).toBe("per gateway");
  });

  it("keeps a description that doesn't start with the exact name", () => {
    expect(descriptionAfterName("WSO2 Integration Cloud - Starter", "WSO2 Integration Cloud Starter Subscription (monthly)")).toBe(
      "WSO2 Integration Cloud Starter Subscription (monthly)",
    );
    expect(descriptionAfterName("WSO2 Gateway", "WSO2 Gateways for every region")).toBe("WSO2 Gateways for every region");
  });

  it("is null when there is nothing beyond the name", () => {
    expect(descriptionAfterName(name, null)).toBeNull();
    expect(descriptionAfterName(name, "  ")).toBeNull();
    expect(descriptionAfterName(name, `${name}.`)).toBeNull();
  });
});
