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

// The Edit tab's Proceed gate, end to end through the shell. The tab keeps a
// client-side step pointer, and every readiness check applies only while its
// own step is showing, so whatever this shell lets through on ProductAnalyzed →
// StagingRequested reaches Staging unchecked. Step bodies are stubbed: only the
// shell's gating is under test.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UmtUpdateProduct, UmtUpdateSummary } from "../api/umtUpdates";

const state = vi.hoisted(() => ({
  transition: vi.fn<(next: string) => Promise<void>>(async () => undefined),
  isAdmin: false,
  isProductLead: false,
  additionalFileOperations: [] as unknown[],
  stagingResults: [] as unknown[],
  hotfixTestStatus: null as string | null,
  releaseHotfix: vi.fn<(reason: string | null) => Promise<void>>(async () => undefined),
}));

vi.mock("../api/useUmtUpdateViewData", () => ({
  useUmtPullRequestAnalysis: () => ({
    isSuccess: true,
    data: { additionalFileOperations: state.additionalFileOperations },
  }),
  useUmtProductAnalysis: () => ({ isSuccess: true, data: {} }),
}));

vi.mock("../api/useUmtTesting", () => ({
  useUmtStagingTestResults: () => ({ isSuccess: true, data: state.stagingResults }),
}));

vi.mock("../api/useUmtHotfixRelease", () => ({
  useUmtHotfixTestStatus: () => ({ isSuccess: true, isPending: false, data: state.hotfixTestStatus }),
  useUmtReleaseHotfix: () => ({ isPending: false, mutateAsync: state.releaseHotfix }),
}));

vi.mock("../components/edit/hotfix-release/UmtHotfixReleaseStep", () => ({
  default: () => <div data-testid="step-hotfix-release" />,
}));

vi.mock("../api/useUmtGate", () => ({
  useUmtGate: () => ({
    isAuthorized: true,
    isUser: true,
    isAdmin: state.isAdmin,
    isProductLead: state.isProductLead,
    hasRole: () => true,
    isResolving: false,
    isError: false,
    retry: () => {},
  }),
}));

vi.mock("../api/useUmtLifecycleTransition", () => ({
  useUmtLifecycleTransition: () => ({ isPending: false, mutateAsync: state.transition }),
}));

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

vi.mock("../api/useUmtPrAnalysis", () => ({
  useUmtIsAdvancingToPrAnalyzed: () => false,
}));
// Stands in for changing an input without clicking Analyze.
vi.mock("../components/edit/files-analysis/UmtFilesAnalysisStep", () => ({
  default: ({ onDirtyChange }: { onDirtyChange?: (isDirty: boolean) => void }) => (
    <div data-testid="step-files-analysis">
      <button type="button" onClick={() => onDirtyChange?.(true)}>
        Make an unanalysed change
      </button>
    </div>
  ),
}));
vi.mock("../components/edit/description-instruction/UmtDescriptionInstructionStep", () => ({
  default: () => <div data-testid="step-description-instruction" />,
}));
vi.mock("../components/edit/security-advisory/UmtSecurityAdvisoryStep", () => ({
  default: () => <div data-testid="step-security-advisory" />,
}));
vi.mock("../components/edit/integration-tests/UmtIntegrationTestsStep", () => ({
  default: () => <div data-testid="step-integration-tests" />,
}));
vi.mock("../components/edit/testing/UmtTestingStep", () => ({
  default: () => <div data-testid="step-testing" />,
}));
vi.mock("../components/edit/validate/UmtValidateStep", () => ({
  default: () => <div data-testid="step-validate" />,
}));
vi.mock("../components/edit/file-approval/UmtFileApprovalStep", () => ({
  default: () => <div data-testid="step-file-approval" />,
}));
vi.mock("../components/edit/verifying/UmtVerifyingStep", () => ({
  default: () => <div data-testid="step-verifying" />,
}));
vi.mock("../components/edit/verifying/UmtCompleteUpdateDialog", () => ({
  default: () => null,
}));

const { default: UmtUpdateEditTab } = await import("../components/edit/UmtUpdateEditTab");

const COMPLETE: UmtUpdateProduct = {
  productId: 1,
  product: { name: "wso2am", version: "4.2.0.15.full" },
  description: "Fixes the token refresh.",
  instruction: "Restart the server.",
  testPr: "https://github.com/wso2/product-apim/pull/1",
};

// Added after the description step was passed (e.g. through a demote and
// re-analysis elsewhere): no description, but a Test PR so Integration Tests
// alone would let it through.
const UNDESCRIBED: UmtUpdateProduct = {
  productId: 2,
  product: { name: "wso2is", version: "7.0.0.3.full" },
  description: "",
  instruction: "",
  testPr: "https://github.com/wso2/product-is/pull/2",
};

function makeUpdate(overrides: Partial<UmtUpdateSummary> = {}): UmtUpdateSummary {
  return {
    id: 42,
    lifecycle: "UpdateLifecycle",
    lifecycleState: "ProductAnalyzed",
    promoteStages: ["StagingRequested"],
    isHotfix: false,
    products: [COMPLETE],
    securityAdvisories: [],
    ...overrides,
  };
}

function persistStep(stepId: string) {
  window.localStorage.setItem("one-wso2.umt-edit-step.v1.42", stepId);
}

function renderTab(update: UmtUpdateSummary) {
  return render(<UmtUpdateEditTab id="42" update={update} />);
}

// Whatever the forward button is called on the current step.
function forwardButton() {
  return screen.getByRole("button", { name: /^(Next|Proceed|Approve and Proceed|Complete Update)$/ });
}

beforeEach(() => {
  window.localStorage.clear();
  state.transition.mockClear();
  state.isAdmin = false;
  state.isProductLead = false;
  state.additionalFileOperations = [];
  state.stagingResults = [];
  state.hotfixTestStatus = null;
  state.releaseHotfix.mockClear();
});

describe("Files Analysis (PRAnalyzed)", () => {
  const atPrAnalyzed = () => makeUpdate({ lifecycleState: "PRAnalyzed", promoteStages: ["ProductAnalyzed"] });

  it("promotes straight away when nothing is left unanalysed", async () => {
    renderTab(atPrAnalyzed());

    await userEvent.click(forwardButton());

    expect(screen.queryByText("Unanalysed Changes")).not.toBeInTheDocument();
    expect(state.transition).toHaveBeenCalledWith("ProductAnalyzed");
  });

  // Proceed promotes on the last analysis result, so changes made since then
  // would be dropped; the user is asked, and decides.
  it("asks before promoting past unanalysed changes, and promotes only on confirm", async () => {
    renderTab(atPrAnalyzed());
    await userEvent.click(screen.getByRole("button", { name: "Make an unanalysed change" }));

    await userEvent.click(forwardButton());
    expect(await screen.findByText("Unanalysed Changes")).toBeInTheDocument();
    expect(state.transition).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Unanalysed Changes")).not.toBeInTheDocument());
    expect(state.transition).not.toHaveBeenCalled();

    await userEvent.click(forwardButton());
    await userEvent.click(await screen.findByRole("button", { name: "Proceed Anyway" }));

    expect(state.transition).toHaveBeenCalledWith("ProductAnalyzed");
  });
});

describe("Description and Instruction", () => {
  it("holds Next until every product has a description and instruction", () => {
    renderTab(makeUpdate({ products: [COMPLETE, UNDESCRIBED] }));

    expect(screen.getByTestId("step-description-instruction")).toBeInTheDocument();
    expect(forwardButton()).toBeDisabled();
    expect(screen.getByText(/Every product needs a description and instruction/)).toBeInTheDocument();
  });

  it("moves to Integration Tests locally, without a lifecycle transition", async () => {
    renderTab(makeUpdate());

    await userEvent.click(forwardButton());

    expect(screen.getByTestId("step-integration-tests")).toBeInTheDocument();
    expect(state.transition).not.toHaveBeenCalled();
  });
});

describe("Integration Tests", () => {
  it("holds Proceed until every product has a Test PR or an ignore reason", () => {
    persistStep("integration-tests");
    renderTab(makeUpdate({ products: [{ ...COMPLETE, testPr: "", ignoreTestReason: "" }] }));

    expect(screen.getByTestId("step-integration-tests")).toBeInTheDocument();
    expect(forwardButton()).toBeDisabled();
  });

  it("sends the next promote stage once complete", async () => {
    persistStep("integration-tests");
    renderTab(makeUpdate());

    await userEvent.click(forwardButton());

    expect(state.transition).toHaveBeenCalledWith("StagingRequested");
  });
});

describe("Security Advisory", () => {
  const security = (overrides: Partial<UmtUpdateSummary> = {}) =>
    makeUpdate({ lifecycle: "SecurityUpdateLifecycle", ...overrides });

  it("comes right after Description and Instruction", async () => {
    renderTab(security({ securityAdvisories: [{ securityAdvisoryName: "WSO2-2026-1234" }] }));

    await userEvent.click(forwardButton());

    expect(screen.getByTestId("step-security-advisory")).toBeInTheDocument();
  });

  // A security update must have its advisory before StagingRequested: once it
  // is in Staging, no step here can add one.
  it("holds Security Advisory's Next until an advisory is saved", () => {
    persistStep("security-advisory");
    renderTab(security({ securityAdvisories: [] }));

    expect(screen.getByTestId("step-security-advisory")).toBeInTheDocument();
    expect(forwardButton()).toBeDisabled();
    expect(screen.getByText(/needs at least one security advisory/)).toBeInTheDocument();
  });

  it("lets Security Advisory's Next through once an advisory is saved", () => {
    persistStep("security-advisory");
    renderTab(security({ securityAdvisories: [{ securityAdvisoryName: "WSO2-2026-1234" }] }));

    expect(forwardButton()).toBeEnabled();
  });

  // Integration Tests fires ProductAnalyzed → StagingRequested, and a
  // persisted step pointer can land on it without passing Security Advisory.
  it("holds Proceed out of ProductAnalyzed while a security update has no advisory", () => {
    persistStep("integration-tests");
    renderTab(security({ securityAdvisories: [{ securityAdvisoryName: "  " }] }));

    expect(forwardButton()).toBeDisabled();
    expect(screen.getByText(/needs at least one security advisory/)).toBeInTheDocument();
  });

  it("sends StagingRequested for a security update that has its advisory", async () => {
    persistStep("integration-tests");
    renderTab(security({ securityAdvisories: [{ securityAdvisoryName: "WSO2-2026-1234" }] }));

    await userEvent.click(forwardButton());

    expect(state.transition).toHaveBeenCalledWith("StagingRequested");
  });

  it("never asks a regular update for an advisory", () => {
    persistStep("integration-tests");
    renderTab(makeUpdate({ securityAdvisories: [] }));

    expect(forwardButton()).toBeEnabled();
  });
});

describe("Testing and Validate (Staging)", () => {
  it("holds Testing's Next until every staging row has a result", () => {
    state.stagingResults = [{ productId: 1, manualTestResult: "failure", manualTestComment: "" }];
    renderTab(makeUpdate({ lifecycleState: "Staging", promoteStages: ["UATStaging"] }));

    expect(screen.getByTestId("step-testing")).toBeInTheDocument();
    expect(forwardButton()).toBeDisabled();
  });

  it("holds Testing's Next before the environment reaches Staging", () => {
    state.stagingResults = [{ productId: 1, manualTestResult: "success" }];
    renderTab(makeUpdate({ lifecycleState: "StagingRequested", promoteStages: ["Staging"] }));

    expect(forwardButton()).toBeDisabled();
  });
});

describe("File Approval", () => {
  beforeEach(() => {
    state.additionalFileOperations = [{ file: "repository/components/dropins/a.jar", operation: "Added" }];
  });

  it("lets only an admin or product lead approve at WaitingFileApproval", async () => {
    renderTab(makeUpdate({ lifecycleState: "WaitingFileApproval", promoteStages: ["UATStaging"] }));

    expect(forwardButton()).toBeDisabled();
    expect(screen.getByText(/Only UMT Admins or Product Leads can approve this step/)).toBeInTheDocument();
  });

  it("sends UATStaging when a product lead approves", async () => {
    state.isProductLead = true;
    renderTab(makeUpdate({ lifecycleState: "WaitingFileApproval", promoteStages: ["UATStaging"] }));

    await userEvent.click(forwardButton());

    expect(state.transition).toHaveBeenCalledWith("UATStaging");
  });

  // Any developer may send Staging → UATStaging; with manual files the update
  // goes to WaitingFileApproval for a lead to approve. Only that second step is
  // lead-only.
  it("lets a developer hand a Staging update with manual files over for approval", () => {
    persistStep("file-approval");
    renderTab(makeUpdate({ lifecycleState: "Staging", promoteStages: ["UATStaging"] }));

    expect(forwardButton()).toBeEnabled();
  });

  it("calls the hand-off Proceed, not an approval, and sends UATStaging", async () => {
    persistStep("file-approval");
    renderTab(makeUpdate({ lifecycleState: "Staging", promoteStages: ["UATStaging"] }));

    expect(screen.queryByRole("button", { name: "Approve and Proceed" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Proceed" }));

    expect(state.transition).toHaveBeenCalledWith("UATStaging");
  });
});

describe("while a demotion from Staging is in flight (DemoteStagingRequested)", () => {
  const demoting = () => makeUpdate({ lifecycleState: "DemoteStagingRequested", promoteStages: ["Development"] });

  it("locks the update: a notice, no step body and no actions", () => {
    renderTab(demoting());

    expect(screen.getByText(/being demoted from Staging to Development/)).toBeInTheDocument();
    expect(screen.queryByTestId("step-testing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-files-analysis")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("stays locked even on a step pointer saved before the demotion", () => {
    persistStep("validate");
    renderTab(demoting());

    expect(screen.queryByTestId("step-validate")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("leaves an update in any other state editable", () => {
    renderTab(makeUpdate({ lifecycleState: "Staging", promoteStages: ["UATStaging"] }));

    expect(screen.queryByText(/being demoted from Staging to Development/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demote to Development" })).toBeInTheDocument();
  });
});

describe("hotfix release (TestingEnvironmentCreated)", () => {
  const hotfix = (overrides: Partial<UmtUpdateSummary> = {}) =>
    makeUpdate({
      isHotfix: true,
      lifecycle: "HotFixLifecycle",
      lifecycleState: "TestingEnvironmentCreated",
      promoteStages: ["Released"],
      ...overrides,
    });
  const releaseButton = () => screen.getByRole("button", { name: "Release Hotfix" });

  it("shows the hotfix release step in place of the staging test review", () => {
    renderTab(hotfix());

    expect(screen.getByTestId("step-hotfix-release")).toBeInTheDocument();
    expect(screen.queryByTestId("step-testing")).not.toBeInTheDocument();
  });

  it("lets anyone release once the integration tests passed, with no reason", async () => {
    state.hotfixTestStatus = "success";
    renderTab(hotfix());

    await userEvent.click(releaseButton());

    expect(state.releaseHotfix).toHaveBeenCalledWith(null);
    expect(state.transition).not.toHaveBeenCalled();
  });

  it("holds a developer's release while the tests haven't passed", () => {
    state.hotfixTestStatus = "failure";
    renderTab(hotfix());

    expect(releaseButton()).toBeDisabled();
    expect(screen.getByText(/integration tests must pass before release/)).toBeInTheDocument();
  });

  it("lets a lead release without a pass, but only with a reason", async () => {
    state.hotfixTestStatus = "unstable";
    state.isProductLead = true;
    renderTab(hotfix());

    await userEvent.click(releaseButton());
    const release = await screen.findByRole("button", { name: "Release" });
    expect(release).toBeDisabled();

    await userEvent.click(screen.getByLabelText("Reason"));
    await userEvent.paste("  Known flaky test, verified manually  ");
    await userEvent.click(release);

    expect(state.releaseHotfix).toHaveBeenCalledWith("Known flaky test, verified manually");
  });

  it("lets an admin release before any test run, with a reason", async () => {
    state.hotfixTestStatus = null;
    state.isAdmin = true;
    renderTab(hotfix());

    await userEvent.click(releaseButton());

    expect(await screen.findByText("Release Without Passing Tests")).toBeInTheDocument();
    expect(state.releaseHotfix).not.toHaveBeenCalled();
  });

  it("waits while the testing environment is being created", () => {
    renderTab(hotfix({ lifecycleState: "TestingEnvironmentRequested", promoteStages: [] }));

    expect(forwardButton()).toBeDisabled();
    expect(screen.getByText(/Waiting for the hotfix testing environment/)).toBeInTheDocument();
  });

  it("marks a failed testing environment created", async () => {
    renderTab(hotfix({ lifecycleState: "TestingEnvironmentFailed", promoteStages: ["TestingEnvironmentCreated"] }));

    await userEvent.click(forwardButton());

    expect(state.transition).toHaveBeenCalledWith("TestingEnvironmentCreated");
  });
});
