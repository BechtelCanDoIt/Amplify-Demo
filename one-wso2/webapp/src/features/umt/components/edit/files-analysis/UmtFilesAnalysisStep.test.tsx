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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UmtUpdateSummary } from "../../../api/umtUpdates";

const state = vi.hoisted(() => ({ isAdvancing: false }));

vi.mock("../../../api/useUmtPrAnalysis", () => ({
  useUmtIsAdvancingToPrAnalyzed: () => state.isAdvancing,
}));
vi.mock("../pr-analysis/UmtPrAnalysisStep", () => ({ default: () => <div>PR analysis</div> }));
vi.mock("../product-analysis/UmtProductAnalysisStep", () => ({ default: () => <div>Product analysis</div> }));

const { default: UmtFilesAnalysisStep } = await import("./UmtFilesAnalysisStep");

function renderStep(lifecycleState: string) {
  render(<UmtFilesAnalysisStep id="42" update={{ id: 42, lifecycleState } as UmtUpdateSummary} />);
}

describe("UmtFilesAnalysisStep", () => {
  beforeEach(() => {
    state.isAdvancing = false;
  });

  it("shows only the PR analysis in Development", () => {
    renderStep("Development");

    expect(screen.getByText("PR analysis")).toBeInTheDocument();
    expect(screen.queryByText("Product analysis")).not.toBeInTheDocument();
  });

  it("adds the product analysis in PRAnalyzed", () => {
    renderStep("PRAnalyzed");

    expect(screen.getByText("Product analysis")).toBeInTheDocument();
  });

  it("holds the product analysis back while the run that promoted the update is still going", () => {
    state.isAdvancing = true;
    renderStep("PRAnalyzed");

    expect(screen.queryByText("Product analysis")).not.toBeInTheDocument();
  });
});
