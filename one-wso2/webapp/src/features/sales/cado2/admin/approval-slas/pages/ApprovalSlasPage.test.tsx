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

import Cado2ToastProvider from "@features/sales/cado2/components/toast/Cado2ToastProvider";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ApprovalSlasPage from "./ApprovalSlasPage";

const policy = { data: undefined as unknown, error: null as unknown, isFetching: false, refetch: vi.fn() };
const changes = { data: [] as unknown, error: null as unknown, isFetching: false, refetch: vi.fn() };
const save = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, error: null as unknown };

vi.mock("@features/sales/cado2/admin/approval-slas/api/useApprovalSlas", () => ({
  useApprovalSlas: () => policy,
  useApprovalSlaChanges: () => changes,
  useSaveApprovalSlas: () => save,
}));

const roles = [
  { role: "DEAL_DESK", roleLabel: "Deal Desk", hours: 24 },
  { role: "CFO", roleLabel: "CFO", hours: 24 },
];

beforeEach(() => {
  policy.data = { roles, atRiskPercent: 75, minHours: 1, maxHours: 720 };
  changes.data = [];
  Object.assign(save, { mutate: vi.fn(), isSuccess: false, error: null });
});

describe("ApprovalSlasPage", () => {
  it("sets each role's hours and the at-risk share, and saves only a valid change", async () => {
    render(
      <Cado2ToastProvider>
        <ApprovalSlasPage />
      </Cado2ToastProvider>,
    );
    const user = userEvent.setup();
    const save$ = screen.getByRole("button", { name: "Save" });
    expect(save$).toBeDisabled(); // nothing changed yet
    expect(screen.getByText(/approvals already waiting keep their deadline/)).toBeInTheDocument();

    const dd = screen.getByRole("textbox", { name: "Deal Desk: hours to respond" });
    await user.clear(dd);
    await user.type(dd, "0");
    expect(screen.getByText("1–720 hours")).toBeInTheDocument();
    expect(save$).toBeDisabled();

    await user.clear(dd);
    await user.type(dd, "8");
    const cfo = screen.getByRole("textbox", { name: "CFO: hours to respond" });
    await user.clear(cfo);
    await user.type(cfo, "48");
    await user.click(save$);
    expect(save.mutate).toHaveBeenCalledWith({ hours: { DEAL_DESK: 8, CFO: 48 }, atRiskPercent: 75 }, expect.anything());
    // "It worked" is a toast (2026-10-13), not a message that stays.
    const [, opts] = save.mutate.mock.calls[0] as [unknown, { onSuccess: () => void }];
    act(() => opts.onSuccess());
    expect(await screen.findByRole("status")).toHaveTextContent("Saved. New approvals use these times.");
  });

  it("lists the changes made", () => {
    changes.data = [
      { id: 2, setting: "SLA_AT_RISK_PERCENT", label: "At risk from", oldValue: 75, newValue: 80, changedByEmail: "admin@wso2.com", changedAt: "2026-10-01T10:00:00Z" },
      { id: 1, setting: "CFO", label: "CFO", oldValue: 24, newValue: 48, changedByEmail: "admin@wso2.com", changedAt: "2026-10-01T09:00:00Z" },
    ];
    render(<ApprovalSlasPage />);
    const log = screen.getByRole("list", { name: "SLA changes" });
    expect(log).toHaveTextContent("At risk from: 75 % → 80 %");
    expect(log).toHaveTextContent("CFO: 24 h → 48 h");
  });
});
