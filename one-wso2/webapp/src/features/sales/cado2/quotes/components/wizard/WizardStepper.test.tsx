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
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WizardStepper from "./WizardStepper";

const nav = () => within(screen.getByRole("navigation", { name: "Quote steps" }));

describe("WizardStepper", () => {
  it("locks the steps beyond the furthest reachable one (filled in order)", async () => {
    const onSelect = vi.fn();
    render(<WizardStepper active={1} reachable={1} readOnly={false} onSelect={onSelect} />);

    expect(nav().getByRole("button", { name: "Overview" })).toHaveTextContent("Done");
    expect(nav().getByRole("button", { name: "Products & Pricing" })).toHaveAttribute("aria-current", "step");
    expect(nav().getByRole("button", { name: "Products & Pricing" })).toHaveTextContent("In progress");
    expect(nav().getByRole("button", { name: "Products & Pricing" })).not.toHaveTextContent(/to complete/); // no counts (F5 review)
    expect(nav().getByRole("button", { name: "Commercials" })).toBeDisabled();
    expect(nav().getByRole("button", { name: "Review" })).toBeDisabled();

    await userEvent.setup().click(nav().getByRole("button", { name: "Overview" }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it("opens the next step once the current one is complete", () => {
    render(<WizardStepper active={1} reachable={2} readOnly={false} onSelect={vi.fn()} />);
    expect(nav().getByRole("button", { name: "Products & Pricing" })).toHaveTextContent("In progress");
    expect(nav().getByRole("button", { name: "Commercials" })).toBeEnabled();
    expect(nav().getByRole("button", { name: "Commercials" })).toHaveTextContent("Up next");
    expect(nav().getByRole("button", { name: "Review" })).toBeDisabled();
  });

  it("lets a read-only version be browsed freely", () => {
    render(<WizardStepper active={3} reachable={0} readOnly onSelect={vi.fn()} />);
    for (const name of ["Overview", "Products & Pricing", "Commercials"]) {
      expect(nav().getByRole("button", { name })).toBeEnabled();
    }
    expect(nav().getByRole("button", { name: "Review" })).toHaveTextContent("Check & submit");
  });
});
