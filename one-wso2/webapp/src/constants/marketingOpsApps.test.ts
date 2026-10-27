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

import { MARKETING_OPS_APPS, MARKETING_OPS_EYEBROW } from "./marketingOpsApps";

const keys = (apps: readonly { key: string }[]) => apps.map((a) => a.key);

describe("the Event Platform rail group", () => {
  it("sits right after Events", () => {
    const order = keys(MARKETING_OPS_APPS);
    expect(order).toContain("event-platform");
    expect(order.indexOf("event-platform")).toBe(order.indexOf("events") + 1);
  });

  it("names its eyebrow after the registry entry", () => {
    expect(MARKETING_OPS_EYEBROW.eventPlatform.label).toBe("Event Platform");
  });
});
