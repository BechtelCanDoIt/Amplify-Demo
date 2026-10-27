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
import { render, screen } from "@testing-library/react";
import { encodeParComment } from "../util/parComment";
import type { Par360Review } from "../api/types";

let review: Par360Review | undefined;

vi.mock("../api/usePar360", () => ({
  useMyReview: () => ({ data: review, isLoading: false, isError: false }),
  useSubmitReview: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

vi.mock("@features/leave/api/useLeaveData", () => ({
  useLeaveEmployees: () => ({
    data: [{ workEmail: "ada@wso2.com", firstName: "Ada", lastName: "Lovelace" }],
    isLoading: false,
  }),
}));

const { default: Par360ReviewDialog } = await import("./Par360ReviewDialog");

function renderDialog() {
  render(
    <Par360ReviewDialog
      open
      onClose={() => {}}
      parCycleId={1}
      employeeEmail="ada@wso2.com"
      reviewQuestion="Question"
      reviewRatings={["Satisfactory", "Excellent"]}
      reviewDeadline="2999-01-01"
    />,
  );
}

describe("Par360ReviewDialog", () => {
  it("shows a shared review read-only, with only Close", () => {
    review = {
      reviewerEmail: "me@wso2.com",
      reviewRating: "Satisfactory",
      reviewComment: encodeParComment("<p>Great work</p>"),
      reviewStatus: "SHARED",
    };
    renderDialog();
    expect(screen.getByText("Satisfactory")).toBeInTheDocument();
    expect(screen.getByText("Great work")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    for (const name of ["Cancel", "Save draft", "Share", "Decline"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("shows a declined review's reason without a rating", () => {
    review = {
      reviewerEmail: "me@wso2.com",
      reviewComment: encodeParComment("<p>Not my area</p>"),
      reviewStatus: "REJECTED",
    };
    renderDialog();
    expect(screen.getByText("Reason:")).toBeInTheDocument();
    expect(screen.getByText("Not my area")).toBeInTheDocument();
    expect(screen.queryByText("Rating:")).not.toBeInTheDocument();
  });

  it("keeps the edit actions for a draft", () => {
    review = { reviewerEmail: "me@wso2.com", reviewStatus: "DRAFT" };
    renderDialog();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
