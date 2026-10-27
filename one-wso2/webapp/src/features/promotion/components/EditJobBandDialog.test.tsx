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
import type { PromotableRole, PromotionRequestFull } from "../api/types";

const mutate = vi.hoisted(() => vi.fn());
const lookup = vi.hoisted(() => ({
  roles: [] as PromotableRole[],
  isLoading: false,
  isError: false,
  error: null as unknown,
}));

vi.mock("../api/usePromotionRequests", () => ({
  useUpdatePromotionRequestJobBand: () => ({ mutate, isPending: false, isError: false, error: null }),
}));
vi.mock("../api/usePromotionDesignations", () => ({
  usePromotionDesignations: () => ({
    data: { roles: lookup.roles },
    isLoading: lookup.isLoading,
    isError: lookup.isError,
    error: lookup.error,
  }),
}));

const { default: EditJobBandDialog } = await import("./EditJobBandDialog");

function promotionRequest(overrides: Partial<PromotionRequestFull> = {}): PromotionRequestFull {
  return {
    id: 7,
    employeeEmail: "jane@wso2.com",
    currentJobBand: 5,
    currentJobRole: "Software Engineer",
    nextJobBand: 6,
    promotedJobRole: "Senior Software Engineer",
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
    promotionType: "TIME_BASED",
    status: "SUBMITTED",
    reasonForRejection: null,
    isNotificationEmailSent: false,
    ...overrides,
  };
}

const role = (designation: string, jobBand: number): PromotableRole => ({ designation, jobBand });

async function openPicker() {
  const user = userEvent.setup();
  render(<EditJobBandDialog request={promotionRequest()} onClose={() => undefined} />);
  await user.click(screen.getByRole("button", { name: "Open" }));
  return user;
}

const optionLabels = () => screen.getAllByRole("option").map((o) => o.textContent);

beforeEach(() => {
  mutate.mockReset();
  lookup.roles = [];
  lookup.isLoading = false;
  lookup.isError = false;
  lookup.error = null;
});

describe("EditJobBandDialog", () => {
  it("shows the current role with its band", () => {
    render(<EditJobBandDialog request={promotionRequest()} onClose={() => undefined} />);
    expect(screen.getByDisplayValue("Software Engineer (JB 5)")).toBeInTheDocument();
  });

  it("lists every role in band order, keeping several roles for one band", async () => {
    lookup.roles = [role("Architect", 9), role("Associate Technical Lead", 7), role("Associate Architect", 9)];
    await openPicker();
    expect(optionLabels()).toEqual([
      "Senior Software Engineer (JB 6)",
      "Associate Technical Lead (JB 7)",
      "Architect (JB 9)",
      "Associate Architect (JB 9)",
    ]);
  });

  it("falls back to bands above the current one when the lookup returns no roles", async () => {
    await openPicker();
    expect(optionLabels()).toEqual([
      "Senior Software Engineer (JB 6)",
      "JB 7",
      "JB 8",
      "JB 9",
      "JB 10",
      "JB 11",
      "JB 12",
      "JB 13",
    ]);
  });

  it("sends the picked band and role", async () => {
    lookup.roles = [role("Senior Software Engineer", 6), role("Technical Lead", 8)];
    const user = await openPicker();
    await user.click(screen.getByRole("option", { name: "Technical Lead (JB 8)" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(mutate).toHaveBeenCalledWith(
      { id: 7, promotingJobBand: 8, promotedJobRole: "Technical Lead" },
      expect.anything(),
    );
  });

  it("leaves the role out when the picked band has none", async () => {
    const user = await openPicker();
    await user.click(screen.getByRole("option", { name: "JB 8" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    expect(mutate).toHaveBeenCalledWith({ id: 7, promotingJobBand: 8 }, expect.anything());
  });

  it("refuses to save the band and role already on the request", async () => {
    const user = userEvent.setup();
    render(<EditJobBandDialog request={promotionRequest()} onClose={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Please select a different job band or role than the current one.")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps Save disabled while the roles load", () => {
    lookup.isLoading = true;
    render(<EditJobBandDialog request={promotionRequest()} onClose={() => undefined} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("warns when the roles can't be loaded", () => {
    lookup.isError = true;
    lookup.error = new Error("boom");
    render(<EditJobBandDialog request={promotionRequest()} onClose={() => undefined} />);
    expect(screen.getByText(/Couldn't load the job roles/)).toBeInTheDocument();
  });
});
