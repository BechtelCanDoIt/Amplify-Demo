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

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DealFlag } from "../types";
import { DealFlagMarker, DealFlags } from "./DealFlags";

const stuck: DealFlag = {
  code: "STUCK_IN_STAGE",
  title: "Stuck in stage",
  detail: "In Qualify for 64 days.",
  nextStep: "Agree what moves it to Technical Proof.",
};
const quiet: DealFlag = {
  code: "GONE_QUIET",
  title: "Gone quiet",
  detail: "No call, email or task in 26 days.",
  nextStep: "Book a call or send a follow-up to the customer.",
};

describe("DealFlags", () => {
  it("lists each flag with why and the next step", () => {
    render(<DealFlags flags={[stuck, quiet]} />);
    const box = screen.getByRole("region", { name: "Needs attention" });
    expect(box).toHaveTextContent("Stuck in stage. In Qualify for 64 days.");
    expect(box).toHaveTextContent("Next step: Agree what moves it to Technical Proof.");
    expect(box).toHaveTextContent("Gone quiet. No call, email or task in 26 days.");
  });

  it("shows nothing without flags", () => {
    const { container } = render(<DealFlags flags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("DealFlagMarker", () => {
  it("is reachable by keyboard, named briefly by the flags' titles", () => {
    render(<DealFlagMarker flags={[stuck, quiet]} />);
    const marker = screen.getByRole("button", { name: "Needs attention: Stuck in stage, Gone quiet" });
    expect(marker).toHaveAttribute("tabindex", "0");
    expect(marker).toHaveTextContent("2");
  });

  it("does not open the row when clicked", () => {
    const onRow = vi.fn();
    render(
      <div onClick={onRow}>
        <DealFlagMarker flags={[stuck]} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Needs attention/ }));
    expect(onRow).not.toHaveBeenCalled();
  });
});
