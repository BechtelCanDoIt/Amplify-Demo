// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

import { describe, expect, it } from "vitest";
import {
  computeUmtEditSteps,
  resolveUmtEditActiveIndex,
  umtActiveStepId,
  umtActiveStepIndex,
  umtHasAdditionalFileOperations,
  umtStepRequiresDescriptions,
  type UmtEditStepId,
} from "./umtEditSteps";

const NORMAL_NO_FILES: UmtEditStepId[] = [
  "files-analysis",
  "description-instruction",
  "integration-tests",
  "testing",
  "validate",
  "verifying",
  "completed",
];

const NORMAL_WITH_FILES: UmtEditStepId[] = [
  "files-analysis",
  "description-instruction",
  "integration-tests",
  "testing",
  "validate",
  "file-approval",
  "verifying",
  "completed",
];

const SECURITY_NO_FILES: UmtEditStepId[] = [
  "files-analysis",
  "description-instruction",
  "security-advisory",
  "integration-tests",
  "testing",
  "validate",
  "verifying",
  "completed",
];

const SECURITY_WITH_FILES: UmtEditStepId[] = [
  "files-analysis",
  "description-instruction",
  "security-advisory",
  "integration-tests",
  "testing",
  "validate",
  "file-approval",
  "verifying",
  "completed",
];

function ids(steps: { id: UmtEditStepId }[]): UmtEditStepId[] {
  return steps.map((step) => step.id);
}

describe("computeUmtEditSteps", () => {
  it("returns the Cloud Support 2-step flow regardless of additional files", () => {
    expect(ids(computeUmtEditSteps("CloudSupportLifecycle", false))).toEqual([
      "cloud-development",
      "cloud-released",
    ]);
    expect(ids(computeUmtEditSteps("CloudSupportLifecycle", true))).toEqual([
      "cloud-development",
      "cloud-released",
    ]);
  });

  it("returns the 7-step normal sequence with no additional files", () => {
    expect(ids(computeUmtEditSteps("UpdateLifecycle", false))).toEqual(NORMAL_NO_FILES);
  });

  it("inserts File Approval before Verifying when additional files exist", () => {
    expect(ids(computeUmtEditSteps("UpdateLifecycle", true))).toEqual(NORMAL_WITH_FILES);
  });

  it("inserts Security Advisory right after Description and Instruction", () => {
    expect(ids(computeUmtEditSteps("SecurityUpdateLifecycle", false))).toEqual(SECURITY_NO_FILES);
  });

  it("inserts both Security Advisory and File Approval in the correct relative order", () => {
    expect(ids(computeUmtEditSteps("SecurityUpdateLifecycle", true))).toEqual(SECURITY_WITH_FILES);
  });

  it("falls back to the normal sequence for a null or unrecognized lifecycle", () => {
    expect(ids(computeUmtEditSteps(null, false))).toEqual(NORMAL_NO_FILES);
    expect(ids(computeUmtEditSteps("SomeFutureLifecycle", false))).toEqual(NORMAL_NO_FILES);
  });
});

describe("umtHasAdditionalFileOperations", () => {
  it("is false when there are no additional file operations and the state isn't WaitingFileApproval", () => {
    expect(umtHasAdditionalFileOperations(undefined, "Development")).toBe(false);
    expect(umtHasAdditionalFileOperations({ additionalFileOperations: [] }, "PRAnalyzed")).toBe(false);
  });

  it("is true when additional file operations exist", () => {
    expect(
      umtHasAdditionalFileOperations(
        { additionalFileOperations: [{ file: "a.jar", operation: "added" }] },
        "PRAnalyzed",
      ),
    ).toBe(true);
  });

  it("is true when lifecycleState is WaitingFileApproval even with no additional files", () => {
    expect(umtHasAdditionalFileOperations({ additionalFileOperations: [] }, "WaitingFileApproval")).toBe(
      true,
    );
    expect(umtHasAdditionalFileOperations(undefined, "WaitingFileApproval")).toBe(true);
  });
});

describe("proceedWired", () => {
  const WIRED: UmtEditStepId[] = [
    "files-analysis",
    "description-instruction",
    "security-advisory",
    "integration-tests",
    "testing",
    "validate",
    "file-approval",
    "verifying",
    "cloud-development",
  ];

  it("is true only for the steps with real, wired-up Proceed behavior", () => {
    for (const steps of [
      computeUmtEditSteps("UpdateLifecycle", true),
      computeUmtEditSteps("SecurityUpdateLifecycle", true),
      computeUmtEditSteps("CloudSupportLifecycle", false),
    ]) {
      for (const step of steps) {
        expect(step.proceedWired).toBe(WIRED.includes(step.id));
      }
    }
  });
});

describe("advancesLocallyToNextStep", () => {
  // description-instruction, security-advisory, and testing are always
  // local-advance, regardless of lifecycle or additional files. validate is
  // the one conditional case: local-advance only when File Approval is also
  // in the list (it isn't then the last step of the shared Staging run),
  // otherwise it performs the real transition itself.
  const ALWAYS_LOCAL_ADVANCE: UmtEditStepId[] = ["description-instruction", "security-advisory", "testing"];

  it("is true for description-instruction, security-advisory, and testing regardless of additional files", () => {
    for (const steps of [
      computeUmtEditSteps("UpdateLifecycle", false),
      computeUmtEditSteps("UpdateLifecycle", true),
      computeUmtEditSteps("SecurityUpdateLifecycle", false),
      computeUmtEditSteps("SecurityUpdateLifecycle", true),
      computeUmtEditSteps("CloudSupportLifecycle", false),
    ]) {
      for (const step of steps) {
        if (step.id === "validate") continue;
        const expected = ALWAYS_LOCAL_ADVANCE.includes(step.id);
        expect(Boolean(step.advancesLocallyToNextStep)).toBe(expected);
      }
    }
  });

  it("is false for validate when File Approval isn't in the list (validate fires the real transition)", () => {
    expect(
      computeUmtEditSteps("UpdateLifecycle", false).find((step) => step.id === "validate")?.advancesLocallyToNextStep,
    ).toBe(false);
    expect(
      computeUmtEditSteps("SecurityUpdateLifecycle", false).find((step) => step.id === "validate")
        ?.advancesLocallyToNextStep,
    ).toBe(false);
  });

  it("is true for validate when File Approval is in the list (File Approval fires the real transition instead)", () => {
    expect(
      computeUmtEditSteps("UpdateLifecycle", true).find((step) => step.id === "validate")?.advancesLocallyToNextStep,
    ).toBe(true);
    expect(
      computeUmtEditSteps("SecurityUpdateLifecycle", true).find((step) => step.id === "validate")
        ?.advancesLocallyToNextStep,
    ).toBe(true);
  });
});

describe("umtActiveStepId / umtActiveStepIndex", () => {
  const normalSteps = computeUmtEditSteps("UpdateLifecycle", false);
  const normalWithFilesSteps = computeUmtEditSteps("UpdateLifecycle", true);
  const securitySteps = computeUmtEditSteps("SecurityUpdateLifecycle", false);
  const securityWithFilesSteps = computeUmtEditSteps("SecurityUpdateLifecycle", true);
  const cloudSteps = computeUmtEditSteps("CloudSupportLifecycle", false);

  it("maps each recognized lifecycleState to its step for the normal sequence", () => {
    const cases: [string, UmtEditStepId][] = [
      ["Development", "files-analysis"],
      ["PRAnalyzed", "files-analysis"],
      ["ProductAnalyzed", "description-instruction"],
      ["StagingRequested", "testing"],
      ["Staging", "testing"],
      ["Released", "verifying"],
      ["UATStaging", "verifying"],
      ["UAT", "verifying"],
      ["UATRequested", "verifying"],
      ["OnHold", "verifying"],
      ["Completed", "completed"],
    ];

    for (const [state, expectedId] of cases) {
      expect(umtActiveStepId(state, normalSteps)).toBe(expectedId);
      expect(umtActiveStepIndex(state, normalSteps)).toBe(
        normalSteps.findIndex((step) => step.id === expectedId),
      );
    }
  });

  it("maps the legacy-unmapped TestingEnvironment* states to Testing (deliberate clean fallback)", () => {
    expect(umtActiveStepId("TestingEnvironmentRequested", normalSteps)).toBe("testing");
    expect(umtActiveStepId("TestingEnvironmentCreated", normalSteps)).toBe("testing");
    expect(umtActiveStepId("TestingEnvironmentFailed", normalSteps)).toBe("testing");
  });

  it("maps WaitingFileApproval to File Approval when the step list includes it", () => {
    expect(umtActiveStepId("WaitingFileApproval", normalWithFilesSteps)).toBe("file-approval");
    expect(umtActiveStepIndex("WaitingFileApproval", normalWithFilesSteps)).toBe(
      normalWithFilesSteps.findIndex((step) => step.id === "file-approval"),
    );
  });

  it("shifts indices correctly for the security and file-approval variants", () => {
    expect(umtActiveStepIndex("ProductAnalyzed", securitySteps)).toBe(1);
    expect(umtActiveStepIndex("Released", securitySteps)).toBe(
      securitySteps.findIndex((step) => step.id === "verifying"),
    );
    expect(umtActiveStepIndex("WaitingFileApproval", securityWithFilesSteps)).toBe(
      securityWithFilesSteps.findIndex((step) => step.id === "file-approval"),
    );
  });

  it("defaults to the first step for null or unrecognized lifecycleState", () => {
    expect(umtActiveStepId(null, normalSteps)).toBe("files-analysis");
    expect(umtActiveStepId("SomeFutureState", normalSteps)).toBe("files-analysis");
    expect(umtActiveStepIndex(null, normalSteps)).toBe(0);
  });

  it("resolves the Cloud Support flow's own two states", () => {
    expect(umtActiveStepId("Development", cloudSteps)).toBe("cloud-development");
    expect(umtActiveStepId("Released", cloudSteps)).toBe("cloud-released");
    expect(umtActiveStepIndex("Released", cloudSteps)).toBe(1);
    expect(umtActiveStepId(null, cloudSteps)).toBe("cloud-development");
  });
});

describe("resolveUmtEditActiveIndex", () => {
  const steps = computeUmtEditSteps("UpdateLifecycle", false);
  const withFiles = computeUmtEditSteps("UpdateLifecycle", true);
  const security = computeUmtEditSteps("SecurityUpdateLifecycle", false);
  const indexIn = (list: typeof steps, id: UmtEditStepId) => list.findIndex((step) => step.id === id);
  const filesAnalysisIndex = indexIn(steps, "files-analysis");
  const descriptionIndex = indexIn(steps, "description-instruction");
  const integrationTestsIndex = indexIn(steps, "integration-tests");
  const testingIndex = indexIn(steps, "testing");
  const validateIndex = indexIn(steps, "validate");
  const verifyingIndex = indexIn(steps, "verifying");

  it("has no override: uses the backend-derived index", () => {
    expect(resolveUmtEditActiveIndex(steps, verifyingIndex, null, "Released")).toBe(verifyingIndex);
  });

  it("honours an override ahead of the backend step within the run of the current state", () => {
    // Testing's advancesLocallyToNextStep moved the user on to Validate while
    // the backend still reports Staging; Description's Next moved them on to
    // Integration Tests under ProductAnalyzed.
    expect(resolveUmtEditActiveIndex(steps, testingIndex, "validate", "Staging")).toBe(validateIndex);
    expect(resolveUmtEditActiveIndex(steps, descriptionIndex, "integration-tests", "ProductAnalyzed")).toBe(
      integrationTestsIndex,
    );
    expect(
      resolveUmtEditActiveIndex(security, indexIn(security, "description-instruction"), "security-advisory", "ProductAnalyzed"),
    ).toBe(indexIn(security, "security-advisory"));
    expect(
      resolveUmtEditActiveIndex(withFiles, indexIn(withFiles, "testing"), "file-approval", "Staging"),
    ).toBe(indexIn(withFiles, "file-approval"));
  });

  it("discards an override from a later state's run, which would skip that state's checks", () => {
    // A "validate" saved during an earlier Staging visit, after the update was
    // demoted elsewhere: Validate's Proceed would promote straight out of
    // ProductAnalyzed with no description, advisory or Test PR check.
    expect(resolveUmtEditActiveIndex(steps, descriptionIndex, "validate", "ProductAnalyzed")).toBe(descriptionIndex);
    expect(resolveUmtEditActiveIndex(steps, filesAnalysisIndex, "integration-tests", "PRAnalyzed")).toBe(
      filesAnalysisIndex,
    );
    expect(resolveUmtEditActiveIndex(steps, filesAnalysisIndex, "validate", "Development")).toBe(filesAnalysisIndex);
    expect(resolveUmtEditActiveIndex(steps, testingIndex, "validate", "StagingRequested")).toBe(testingIndex);
  });

  it("discards a persisted override that sits BEHIND a newer backend lifecycle state", () => {
    // The user left the tab on Validate, the update was promoted elsewhere
    // all the way to Released, and reopening it must land on Verifying.
    expect(resolveUmtEditActiveIndex(steps, verifyingIndex, "validate", "Released")).toBe(verifyingIndex);
  });

  it("discards an override whose step id no longer exists in the current step list", () => {
    expect(
      resolveUmtEditActiveIndex(steps, descriptionIndex, "cloud-development" as UmtEditStepId, "ProductAnalyzed"),
    ).toBe(descriptionIndex);
  });
});

describe("umtStepRequiresDescriptions", () => {
  it("checks descriptions on every step that moves the update out of its state", () => {
    expect(umtStepRequiresDescriptions("description-instruction", "ProductAnalyzed")).toBe(true);
    expect(umtStepRequiresDescriptions("integration-tests", "ProductAnalyzed")).toBe(true);
    expect(umtStepRequiresDescriptions("validate", "Staging")).toBe(true);
    expect(umtStepRequiresDescriptions("file-approval", "Staging")).toBe(true);
  });

  it("leaves the rest alone, including the file approval itself", () => {
    expect(umtStepRequiresDescriptions("file-approval", "WaitingFileApproval")).toBe(false);
    expect(umtStepRequiresDescriptions("files-analysis", "PRAnalyzed")).toBe(false);
    expect(umtStepRequiresDescriptions("security-advisory", "ProductAnalyzed")).toBe(false);
    expect(umtStepRequiresDescriptions("testing", "Staging")).toBe(false);
    expect(umtStepRequiresDescriptions("verifying", "Released")).toBe(false);
  });
});
