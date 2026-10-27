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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PromotionRequestFull } from "../api/types";

const cycle = vi.hoisted(() => ({
  cycle: { id: 1 } as { id: number } | null,
  isPending: false,
  isError: false,
  error: null as unknown,
}));
const requests = vi.hoisted(() => ({
  data: [] as PromotionRequestFull[],
  isPending: false,
  isError: false,
  error: null as unknown,
  refetch: vi.fn(),
}));

vi.mock("../api/usePromotionCycle", () => ({ useActivePromotionCycle: () => cycle }));
vi.mock("../api/usePromotionRequests", () => ({
  usePromotionRequests: () => ({
    data: { promotionRequests: requests.data },
    isPending: requests.isPending,
    isError: requests.isError,
    error: requests.error,
    refetch: requests.refetch,
  }),
  useUpdatePromotionRequestRejectionReason: () => ({ mutate: vi.fn(), isPending: false }),
}));

const { default: AdminIndividualContributorTab } = await import("./AdminIndividualContributorTab");

function promotionRequest(overrides: Partial<PromotionRequestFull> = {}): PromotionRequestFull {
  return {
    id: 1,
    employeeEmail: "jane@wso2.com",
    currentJobBand: 5,
    currentJobRole: "Engineer",
    nextJobBand: 6,
    promotedJobRole: null,
    promotedDate: null,
    promotionCycle: "2026-A",
    promotionStatement: null,
    businessUnit: "Engineering",
    department: "Platform",
    team: "Core",
    subTeam: null,
    recommendations: [],
    createdBy: "system",
    createdOn: "2026-01-01",
    updatedBy: "system",
    updatedOn: "2026-01-01",
    promotionType: "INDIVIDUAL_CONTRIBUTOR",
    status: "APPROVED",
    reasonForRejection: null,
    isNotificationEmailSent: true,
    ...overrides,
  };
}

beforeEach(() => {
  cycle.cycle = { id: 1 };
  cycle.isPending = false;
  cycle.isError = false;
  requests.data = [];
  requests.isPending = false;
  requests.isError = false;
  requests.refetch.mockReset();
});

describe("AdminIndividualContributorTab search", () => {
  it("shows every request when the search field is empty", () => {
    requests.data = [
      promotionRequest({ id: 1, employeeEmail: "jane@wso2.com" }),
      promotionRequest({ id: 2, employeeEmail: "john@wso2.com" }),
    ];
    render(<AdminIndividualContributorTab />);

    expect(screen.getByText("jane@wso2.com")).toBeInTheDocument();
    expect(screen.getByText("john@wso2.com")).toBeInTheDocument();
  });

  it("narrows the grid to rows whose employee email matches the search", async () => {
    const user = userEvent.setup();
    requests.data = [
      promotionRequest({ id: 1, employeeEmail: "jane@wso2.com" }),
      promotionRequest({ id: 2, employeeEmail: "john@wso2.com" }),
    ];
    render(<AdminIndividualContributorTab />);

    await user.type(screen.getByPlaceholderText("Search by employee email"), "jane");

    expect(screen.getByText("jane@wso2.com")).toBeInTheDocument();
    expect(screen.queryByText("john@wso2.com")).not.toBeInTheDocument();
  });

  it("shows a search-specific empty state when the search matches nothing", async () => {
    const user = userEvent.setup();
    requests.data = [promotionRequest({ id: 1, employeeEmail: "jane@wso2.com" })];
    render(<AdminIndividualContributorTab />);

    await user.type(screen.getByPlaceholderText("Search by employee email"), "nobody");

    expect(screen.getByText("No promotion requests match the search")).toBeInTheDocument();
    expect(screen.queryByText("There are no promotion requests for the active cycle")).not.toBeInTheDocument();
  });

  it("shows the active-cycle empty state when there are no requests at all, not the search message", () => {
    requests.data = [];
    render(<AdminIndividualContributorTab />);

    expect(screen.getByText("There are no promotion requests for the active cycle")).toBeInTheDocument();
  });
});
