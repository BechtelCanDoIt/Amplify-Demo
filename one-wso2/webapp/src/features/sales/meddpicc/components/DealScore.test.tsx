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

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DealScore from "./DealScore";

describe("DealScore", () => {
  it("names the score and its band", () => {
    render(<DealScore score={28.3} />);
    expect(screen.getByRole("img", { name: "Opportunity score 28.3, Weak" })).toBeInTheDocument();
  });

  it("names each band as Salesforce's meter does", () => {
    render(
      <>
        <DealScore score={56.4} />
        <DealScore score={78.9} />
      </>,
    );
    expect(screen.getByRole("img", { name: "Opportunity score 56.4, Moderate" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Opportunity score 78.9, Strong" })).toBeInTheDocument();
  });

  it("shows a dash when Salesforce has no score", () => {
    render(<DealScore score={null} />);
    expect(screen.getByRole("img", { name: "No opportunity score" })).toHaveTextContent("—");
  });
});
