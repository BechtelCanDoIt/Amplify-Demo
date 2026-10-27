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

// The Files Analysis step's Proceed (PRAnalyzed → ProductAnalyzed)
// promotes on the last analysis result, so it asks first when inputs changed
// since that analysis. The PR analysis therefore has to report changes made
// since its last Analyze — and not the inputs it fills in from the saved
// analysis.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UmtUpdateSummary } from "../api/umtUpdates";

const state = vi.hoisted(() => ({
  transition: vi.fn(async () => undefined),
  start: vi.fn(async () => undefined),
}));

vi.mock("../api/useUmtUpdateViewData", () => ({
  useUmtPullRequestAnalysis: () => ({
    isFetching: false,
    data: {
      pullRequests: [{ pr: "https://github.com/wso2/carbon/pull/1", preferredVersion: "" }],
      additionalFileOperations: [],
      bundlesInfoChanges: [],
    },
  }),
}));

vi.mock("../api/useUmtLifecycleTransition", () => ({
  useUmtLifecycleTransition: () => ({ isPending: false, mutateAsync: state.transition }),
}));

vi.mock("../api/useUmtPrAnalysis", () => ({
  UmtProductAnalysisFailedError: class extends Error {},
  useUmtPrAnalysisStatus: () => ({ data: "COMPLETED" }),
  useUmtStartPullRequestAnalysis: () => ({ isPending: false, mutateAsync: state.start }),
  useUmtUploadPullRequestAnalysisFile: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUmtProceedFromPrAnalysis: () => ({ isPending: false, isError: false, mutateAsync: vi.fn(), reset: vi.fn() }),
}));

vi.mock("../components/edit/pr-analysis/UmtPrAnalysisResults", () => ({ default: () => null }));

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const { default: UmtPrAnalysisStep } = await import("../components/edit/pr-analysis/UmtPrAnalysisStep");

const PR_ANALYZED: UmtUpdateSummary = { id: 42, lifecycleState: "PRAnalyzed", praStatus: "COMPLETED" };

async function addPullRequest(url: string) {
  await userEvent.click(screen.getByRole("button", { name: "Add pull request" }));
  // Pasted, not typed: per-keystroke typing is slow enough to time out when
  // the whole suite runs in parallel.
  await userEvent.click(screen.getByLabelText("Pull Request URL"));
  await userEvent.paste(url);
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
  // The rest of the step is aria-hidden until the dialog has fully closed.
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

const lastReported = (onDirtyChange: ReturnType<typeof vi.fn>) => onDirtyChange.mock.calls.at(-1)?.[0];

beforeEach(() => {
  window.localStorage.clear();
  state.transition.mockClear();
  state.start.mockClear();
});

describe("PR analysis unanalysed changes", () => {
  it("reports nothing for inputs filled from the saved analysis", () => {
    const onDirtyChange = vi.fn();
    render(<UmtPrAnalysisStep id="42" update={PR_ANALYZED} onDirtyChange={onDirtyChange} />);

    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it("reports a pull request added since the analysis", async () => {
    const onDirtyChange = vi.fn();
    render(<UmtPrAnalysisStep id="42" update={PR_ANALYZED} onDirtyChange={onDirtyChange} />);

    await addPullRequest("https://github.com/wso2/carbon-kernel/pull/7");

    expect(lastReported(onDirtyChange)).toBe(true);
  });

  it("clears it once Analyze has submitted the changes", async () => {
    const onDirtyChange = vi.fn();
    render(<UmtPrAnalysisStep id="42" update={PR_ANALYZED} onDirtyChange={onDirtyChange} />);
    await addPullRequest("https://github.com/wso2/carbon-kernel/pull/7");

    await userEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(state.start).toHaveBeenCalledTimes(1));
    expect(lastReported(onDirtyChange)).toBe(false);
  });
});
