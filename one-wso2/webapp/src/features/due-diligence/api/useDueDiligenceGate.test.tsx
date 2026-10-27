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
import { renderHook } from "@testing-library/react";

const me: { data?: unknown; isPending?: boolean; isError?: boolean; error?: unknown } = {};
vi.mock("./useDueDiligenceMe", () => ({ useDueDiligenceMe: () => me }));

const { useDueDiligenceGate } = await import("./useDueDiligenceGate");

function gateFor(data: unknown) {
  me.data = data;
  me.isPending = false;
  me.isError = false;
  return renderHook(() => useDueDiligenceGate()).result.current;
}

// The source app's own frontend config (REACT_APP_ROLES) never defines an
// "employee"/"everyone" entry — its isAuthorised check is
// `groups.some(role => roleList.includes(role))` against ONLY the specific
// due-diligence groups (finance, legal, admin, superuser, financeCreator,
// financeReviewer, financeApprover, financeSpecialApprover, legalApprover,
// channelManager). The backend's own employeeRole maps to "wso2-everyone"
// in Config.toml — every authenticated WSO2 employee holds it — so treating
// it as sufficient here would open the app to anyone signed in, not just
// due-diligence staff. Confirmed against the live source app: an employee
// holding no due-diligence group gets its 403 page, not the admin UI.
describe("isAuthorized", () => {
  it("employeeRole alone is not enough", () => {
    expect(gateFor({ roles: ["employeeRole"] }).isAuthorized).toBe(false);
  });

  it("no roles at all is not enough", () => {
    expect(gateFor({ roles: [] }).isAuthorized).toBe(false);
  });

  it("any real due-diligence role is enough, employeeRole or not", () => {
    expect(gateFor({ roles: ["financeRole"] }).isAuthorized).toBe(true);
    expect(gateFor({ roles: ["employeeRole", "financeRole"] }).isAuthorized).toBe(true);
    expect(gateFor({ roles: ["adminRole"] }).isAuthorized).toBe(true);
  });

  it("before /user-info has answered, reports no access", () => {
    expect(gateFor(undefined).isAuthorized).toBe(false);
  });
});

describe("canSee", () => {
  it("hides everything from an employeeRole-only caller", () => {
    const gate = gateFor({ roles: ["employeeRole"] });
    expect(gate.canSee("dd-partners")).toBe(false);
    expect(gate.canSee("dd-preferences")).toBe(false);
  });

  it("Preferences stays admin-only even for an otherwise-authorized caller", () => {
    expect(gateFor({ roles: ["financeRole"] }).canSee("dd-preferences")).toBe(false);
    expect(gateFor({ roles: ["adminRole"] }).canSee("dd-preferences")).toBe(true);
  });
});
