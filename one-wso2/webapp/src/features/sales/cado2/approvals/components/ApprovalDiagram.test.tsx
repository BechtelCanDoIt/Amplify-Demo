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

import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApprovalRole, ApprovalStep, StepStatus } from "@features/sales/cado2/approvals/api/approvalTypes";
import ApprovalDiagram from "./ApprovalDiagram";

// React Flow measures the page; jsdom has no layout, so give it the APIs it asks for.
beforeAll(() => {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.assign(globalThis, { ResizeObserver });
  if (!("DOMMatrixReadOnly" in globalThis)) {
    class DOMMatrixReadOnly {
      m22 = 1;
      constructor(transform?: string) {
        const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
        this.m22 = scale !== undefined ? Number(scale) : 1;
      }
    }
    Object.assign(globalThis, { DOMMatrixReadOnly });
  }
  Object.defineProperties(HTMLElement.prototype, {
    offsetHeight: { get: () => 400, configurable: true },
    offsetWidth: { get: () => 900, configurable: true },
  });
});

const step = (role: ApprovalRole, roleLabel: string, dependsOn: ApprovalRole[], status: StepStatus | null, reason: string): ApprovalStep => ({
  stepId: null, role, roleLabel, branches: role === "DEAL_DESK" ? [] : role === "LEGAL" ? ["COMMERCIAL"] : role === "AREA_GM" ? ["DISCOUNT", "COMMERCIAL"] : ["DISCOUNT"],
  dependsOn, triggers: [{ rule: "X", branch: "DISCOUNT", lineNumber: 0, reason }], status, requestedAt: null, actedAt: null,
  actedByEmail: null, comment: null, canAct: false, cantActReason: null,
});

describe("ApprovalDiagram", () => {
  it("draws each role as a node, tells who a merged role waits on, and lists the reasons", async () => {
    render(
      <ApprovalDiagram
        steps={[
          step("DEAL_DESK", "Deal Desk", [], "APPROVED", "Deal Desk reviews every quote"),
          step("LEGAL", "Legal", ["DEAL_DESK"], "APPROVED", "The quote includes special terms"),
          step("REGIONAL_DIRECTOR", "Regional Director", ["DEAL_DESK"], "PENDING", "15% discount"),
          step("AREA_GM", "Area GM", ["LEGAL", "REGIONAL_DIRECTOR"], "WAITING", "Term of 9 months"),
        ]}
      />,
    );
    const graph = screen.getByRole("img", { name: "Approval graph" });
    expect(await within(graph).findByText("Waiting on Regional Director")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Legend")).getByText("Their turn now")).toBeInTheDocument();

    const reasons = screen.getByRole("list", { name: "Approval chain" });
    const agm = within(reasons).getByRole("listitem", { name: "Area GM" });
    expect(agm).toHaveTextContent("after Legal and Regional Director");
    expect(agm).toHaveTextContent("Term of 9 months");

    // Picking a role highlights its reasons.
    await userEvent.setup().click(within(agm).getByRole("button"));
    expect(within(agm).getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("colours a preview by branch", () => {
    render(
      <ApprovalDiagram
        steps={[
          step("DEAL_DESK", "Deal Desk", [], null, "Deal Desk reviews every quote"),
          step("LEGAL", "Legal", ["DEAL_DESK"], null, "The quote includes special terms"),
        ]}
      />,
    );
    const legend = within(screen.getByLabelText("Legend"));
    expect(legend.getByText("Discount")).toBeInTheDocument();
    expect(legend.getByText("Commercial")).toBeInTheDocument();
  });

  it("shows Deal Desk alone without lanes or a legend", () => {
    render(<ApprovalDiagram steps={[step("DEAL_DESK", "Deal Desk", [], null, "Deal Desk reviews every quote")]} />);
    expect(screen.queryByLabelText("Legend")).toBeNull();
    expect(screen.queryByText("Discount approvals")).toBeNull();
  });
});
