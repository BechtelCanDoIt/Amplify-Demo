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
import ApprovalPreviewPanel from "./ApprovalPreviewPanel";

describe("ApprovalPreviewPanel", () => {
  // The shared error notice, with the cause (2026-10-13; was a bare red line).
  it("says when the approvals can't be worked out, in a card of its own", () => {
    render(<ApprovalPreviewPanel preview={undefined} loading={false} error={new Error("Service unavailable")} />);

    expect(screen.getByRole("region", { name: "Who Approves If You Submit Now" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't work out the approvals right now\./);
  });
});
