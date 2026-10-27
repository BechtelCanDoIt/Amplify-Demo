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

// Released → Completed asks for public PRs, which live under
// https://github.com/wso2/. Links saved earlier are shown locked, so they
// count without being re-checked.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UmtUpdateSummary } from "../api/umtUpdates";

const state = vi.hoisted(() => ({
  complete: vi.fn<(request: unknown) => Promise<void>>(async () => undefined),
}));

vi.mock("../api/useUmtVerifying", () => ({
  useUmtCompleteUpdate: () => ({ isPending: false, mutateAsync: state.complete }),
}));

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const { default: UmtCompleteUpdateDialog } = await import("../components/edit/verifying/UmtCompleteUpdateDialog");

function renderDialog(update: Partial<UmtUpdateSummary> = {}) {
  render(
    <UmtCompleteUpdateDialog
      id="42"
      update={{ id: 42, lifecycleState: "Released", ...update }}
      open
      onClose={vi.fn()}
    />,
  );
}

// The editable row is the last "Public Pull Request" field; saved ones above it are disabled.
async function enterNewPullRequest(value: string) {
  const fields = screen.getAllByRole("textbox", { name: "Public Pull Request" });
  await userEvent.click(fields[fields.length - 1]);
  await userEvent.paste(value);
}

const completeButton = () => screen.getByRole("button", { name: "Save and Complete" });

beforeEach(() => {
  state.complete.mockClear();
});

describe("Complete Update dialog", () => {
  it("refuses a public PR outside https://github.com/wso2/", async () => {
    renderDialog();

    await enterNewPullRequest("https://github.com/wso2-support/carbon-apimgt/pull/3");

    expect(completeButton()).toBeDisabled();
    expect(screen.getByText(/must be a pull request under https:\/\/github.com\/wso2\//)).toBeInTheDocument();
  });

  it("completes with a wso2 public PR", async () => {
    renderDialog();

    await enterNewPullRequest("https://github.com/wso2/carbon-apimgt/pull/3");
    await userEvent.click(completeButton());

    expect(state.complete).toHaveBeenCalledWith({
      publicPullRequests: ["https://github.com/wso2/carbon-apimgt/pull/3"],
      reason: "",
    });
  });

  it("completes on an already-saved public PR that predates the rule", async () => {
    renderDialog({ publicPullRequests: ["https://github.com/someone/fork/pull/1"] });

    await userEvent.click(completeButton());

    expect(state.complete).toHaveBeenCalledWith({
      publicPullRequests: ["https://github.com/someone/fork/pull/1"],
      reason: "",
    });
  });
});
