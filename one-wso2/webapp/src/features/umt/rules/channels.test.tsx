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

// A build retrigger or a staging test save acts on one level's or record's own
// channel, so every call names the channel of the level or record it came from.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const state = vi.hoisted(() => ({
  productBuild: vi.fn<(request: unknown) => Promise<void>>(async () => undefined),
  tgBuild: vi.fn<(request: unknown) => Promise<void>>(async () => undefined),
  saveTesting: vi.fn<(rows: unknown) => Promise<void>>(async () => undefined),
}));

vi.mock("../api/useUmtGate", () => ({
  useUmtGate: () => ({
    isAuthorized: true,
    isUser: true,
    isAdmin: true,
    isProductLead: false,
    hasRole: () => true,
    isResolving: false,
    isError: false,
    retry: () => {},
  }),
}));

vi.mock("../api/useUmtReleaseChunks", () => ({
  useUmtReleaseChunks: () => ({
    data: [
      {
        id: 42,
        updateIds: [101],
        updateLevels: [
          { productName: "wso2am", productVersion: "4.2.0", channel: "security", buildStatus: "UNSTABLE" },
        ],
      },
    ],
    isError: false,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: () => {},
  }),
  useUmtReleaseChunkRowStatuses: () => ({
    42: { buildStatusLoading: false, buildStatus: undefined, chunkStatus: { id: 42, updateIds: [101], status: "created" } },
  }),
  useUmtReleaseChunkDockerBuildStatus: () => ({
    data: [],
    isError: false,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: () => {},
  }),
}));

const idleMutation = () => ({ isPending: false, mutateAsync: async () => undefined });

vi.mock("../api/useUmtReleaseChunkActions", () => ({
  useUmtTriggerProductBuild: () => ({ isPending: false, mutateAsync: state.productBuild }),
  useUmtTriggerTgBuild: () => ({ isPending: false, mutateAsync: state.tgBuild }),
  useUmtTriggerReleaseChunkBuilds: idleMutation,
  useUmtTriggerCstBuild: idleMutation,
  useUmtRetriggerDockerBuild: idleMutation,
  useUmtReleaseChunk: idleMutation,
  useUmtSendReleaseChunkEmail: idleMutation,
  useUmtRemoveReleaseChunk: idleMutation,
}));

vi.mock("../api/useUmtTesting", () => ({
  UmtPartialTestingSaveError: class extends Error {},
  useUmtStagingTestResults: () => ({
    isSuccess: true,
    isPending: false,
    isError: false,
    data: [
      {
        productId: 7,
        productName: "wso2am",
        baseVersion: "4.2.0",
        channel: "security",
        automatedTestResult: "success",
      },
    ],
  }),
  useUmtSaveTestingResults: () => ({ isPending: false, mutateAsync: state.saveTesting }),
}));

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const { default: UmtPendingReleaseChunksGrid } = await import("../components/release-chunks/UmtPendingReleaseChunksGrid");
const { default: UmtTestingStep } = await import("../components/edit/testing/UmtTestingStep");

describe("channel on retriggers and staging test saves", () => {
  it("retriggers a product build on the level's own channel", async () => {
    render(<UmtPendingReleaseChunksGrid />);

    await userEvent.click(screen.getByRole("button", { name: "Retrigger Job" }));

    expect(state.productBuild).toHaveBeenCalledWith(
      expect.objectContaining({ productName: "wso2am", productVersion: "4.2.0", channel: "security" }),
    );
  });

  it("retriggers a TG build on the level's own channel", async () => {
    render(<UmtPendingReleaseChunksGrid />);

    await userEvent.click(screen.getByRole("button", { name: "Retrigger TG Job" }));

    expect(state.tgBuild).toHaveBeenCalledWith(expect.objectContaining({ channel: "security" }));
  });

  it("saves a staging test result on its record's own channel", async () => {
    render(<UmtTestingStep id="42" update={{ id: 42, lifecycleState: "Staging" }} />);

    await userEvent.click(screen.getByRole("radio", { name: "Successful" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(state.saveTesting).toHaveBeenCalled());
    expect(state.saveTesting).toHaveBeenCalledWith([
      expect.objectContaining({ productId: 7, manualTestResult: "success", channel: "security" }),
    ]);
  });
});
