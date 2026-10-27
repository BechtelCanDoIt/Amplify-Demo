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
import { render, screen } from "@testing-library/react";
import SlaChip from "@features/sales/cado2/approvals/components/SlaChip";
import { STATUS_COLOR } from "@features/sales/cado2/quotes/lifecycle/lifecycle";
import StatusChip from "./StatusChip";

// Calm statuses, the OneWSO2 way (2026-10-14).
describe("StatusChip", () => {
  it("is outlined unless urgent", () => {
    render(<StatusChip color="success" label="Approved" />);
    expect(screen.getByText("Approved").closest(".MuiChip-root")).toHaveClass("MuiChip-outlined");
  });

  it("fills an outlined chip with a light tint of its own colour", () => {
    render(<StatusChip color="success" label="Approved" />);
    const bg = getComputedStyle(screen.getByText("Approved").closest(".MuiChip-root")!).backgroundColor;
    expect(bg).toMatch(/^rgba\(.*, 0\.1\)$/);
  });

  it("fills only an overdue approval", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    render(<SlaChip state="BREACHED" dueAt="2026-10-14T06:00:00Z" now={now} />);
    render(<SlaChip state="AT_RISK" dueAt="2026-10-14T15:00:00Z" now={now} />);
    expect(screen.getByText(/Overdue by/).closest(".MuiChip-root")).toHaveClass("MuiChip-filled");
    expect(screen.getByText(/Due in/).closest(".MuiChip-root")).toHaveClass("MuiChip-outlined");
  });

  it("shows Closed in grey: an end, not an error", () => {
    expect(STATUS_COLOR.CLOSED).toBe("default");
  });
});
