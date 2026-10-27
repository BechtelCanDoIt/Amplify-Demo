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

import { describe, expect, it } from "vitest";
import {
  umtBuildStatusChip,
  umtCanRetriggerBuild,
  umtCanRetriggerCstBuild,
  umtReleaseChunkCollisionProducts,
  umtReleaseChunkRowAction,
  umtReleaseReadiness,
} from "./umtReleaseChunks";
import type { UmtUpdateSummary } from "../api/umtUpdates";

function update(name: string, version: string): UmtUpdateSummary {
  return {
    id: 1,
    products: [{ product: { name, version } }],
  } as UmtUpdateSummary;
}

describe("umtBuildStatusChip", () => {
  it("maps every known build status to its label", () => {
    expect(umtBuildStatusChip("BUILDING").text).toBe("Building");
    expect(umtBuildStatusChip("IN_PROGRESS").text).toBe("Building");
    expect(umtBuildStatusChip("SUCCESS").text).toBe("Successful");
    expect(umtBuildStatusChip("SUCCEEDED").text).toBe("Successful");
    expect(umtBuildStatusChip("PENDING").text).toBe("Pending");
    expect(umtBuildStatusChip("UNKNOWN").text).toBe("Not Triggered");
    expect(umtBuildStatusChip("UNSTABLE").text).toBe("Unstable");
    expect(umtBuildStatusChip("NO_BUILD_JOB").text).toBe("No Build Job");
  });

  // The CST build names a running build IN_PROGRESS and a finished one
  // SUCCEEDED, where a product or TG build says BUILDING and SUCCESS. Reading
  // either running spelling as a failure would report a healthy build as a
  // broken one, and the spinner is what marks it as still moving.
  it("treats both names for a running build alike, spinner included", () => {
    expect(umtBuildStatusChip("IN_PROGRESS")).toEqual(umtBuildStatusChip("BUILDING"));
    expect(umtBuildStatusChip("IN_PROGRESS").pulsing).toBe(true);
  });

  it("falls back to Failed for any unmapped value, including missing status", () => {
    expect(umtBuildStatusChip("SOMETHING_ELSE").text).toBe("Failed");
    expect(umtBuildStatusChip(null).text).toBe("Failed");
    expect(umtBuildStatusChip(undefined).text).toBe("Failed");
  });
});

describe("umtReleaseChunkRowAction", () => {
  it("maps releasingFailed to a release action carrying the failure reason", () => {
    expect(umtReleaseChunkRowAction("releasingFailed", "boom")).toEqual({
      kind: "release",
      failedReason: "boom",
    });
  });

  it("maps releasingDockerFailed to a docker-retrigger action", () => {
    expect(umtReleaseChunkRowAction("releasingDockerFailed", "boom")).toEqual({
      kind: "docker-retrigger",
      failedReason: "boom",
    });
  });

  it("maps releasing and retriggering to in-progress", () => {
    expect(umtReleaseChunkRowAction("releasing")).toEqual({ kind: "in-progress" });
    expect(umtReleaseChunkRowAction("retriggering")).toEqual({ kind: "in-progress" });
  });

  it("maps created to the created action set", () => {
    expect(umtReleaseChunkRowAction("created")).toEqual({ kind: "created" });
  });

  it("maps any other status (including missing) to no action", () => {
    expect(umtReleaseChunkRowAction("Released")).toEqual({ kind: "none" });
    expect(umtReleaseChunkRowAction(null)).toEqual({ kind: "none" });
    expect(umtReleaseChunkRowAction(undefined)).toEqual({ kind: "none" });
  });
});

describe("umtReleaseChunkCollisionProducts", () => {
  it("returns no collisions when no selected product overlaps a UAT product/version", () => {
    const selected = [update("apim", "4.2.0")];
    const uat = [update("apim", "4.1.0")];
    expect(umtReleaseChunkCollisionProducts(selected, uat)).toEqual([]);
  });

  it("returns the blocking product name when a selected product/version matches a UAT one exactly", () => {
    const selected = [update("apim", "4.2.0")];
    const uat = [update("apim", "4.2.0")];
    expect(umtReleaseChunkCollisionProducts(selected, uat)).toEqual(["apim"]);
  });

  it("does not treat the same product name at a different version as a collision", () => {
    const selected = [update("apim", "4.2.0")];
    const uat = [update("apim", "4.3.0")];
    expect(umtReleaseChunkCollisionProducts(selected, uat)).toEqual([]);
  });

  it("de-duplicates a product name that collides via more than one selected update", () => {
    const selected = [update("apim", "4.2.0"), update("apim", "4.2.0")];
    const uat = [update("apim", "4.2.0")];
    expect(umtReleaseChunkCollisionProducts(selected, uat)).toEqual(["apim"]);
  });
});

describe("umtCanRetriggerBuild", () => {
  it("disallows retrigger while successful, building, or pending", () => {
    expect(umtCanRetriggerBuild("SUCCESS")).toBe(false);
    expect(umtCanRetriggerBuild("BUILDING")).toBe(false);
    expect(umtCanRetriggerBuild("PENDING")).toBe(false);
  });

  // A running build has nothing to retrigger under either name, so no cell
  // ever offers the button next to a "Building" chip.
  it("disallows retrigger for a build running under the CST's own name", () => {
    expect(umtCanRetriggerBuild("IN_PROGRESS")).toBe(false);
    expect(umtCanRetriggerCstBuild("IN_PROGRESS")).toBe(false);
  });

  // The source excludes SUCCEEDED from its CST check only; a per-level build
  // reporting SUCCEEDED still offers a retrigger there, and so does this.
  it("still allows retrigger for SUCCEEDED, unlike the CST check", () => {
    expect(umtCanRetriggerBuild("SUCCEEDED")).toBe(true);
    expect(umtCanRetriggerCstBuild("SUCCEEDED")).toBe(false);
  });

  it("allows retrigger for a failed or never-triggered (missing) status", () => {
    expect(umtCanRetriggerBuild("UNSTABLE")).toBe(true);
    expect(umtCanRetriggerBuild(null)).toBe(true);
    expect(umtCanRetriggerBuild(undefined)).toBe(true);
  });
});

describe("umtReleaseReadiness", () => {
  const level = (buildStatus: string) => ({ buildStatus });
  const status = (levels: { buildStatus: string }[]) => ({ id: 1, updateIds: [1], updateLevels: levels });

  it("is ready only when every update level succeeded", () => {
    expect(umtReleaseReadiness(status([level("SUCCESS"), level("SUCCESS")]))).toBe("ready");
    expect(umtReleaseReadiness(status([level("SUCCESS"), level("UNSTABLE")]))).toBe("blocked");
    expect(umtReleaseReadiness(status([level("SUCCEEDED")]))).toBe("blocked");
  });

  // The trap this exists to close: [].every(...) is true, so an unfetched
  // build status must be its own case rather than an empty level list.
  it("is unknown, not ready, when the build status has not been fetched", () => {
    expect(umtReleaseReadiness(undefined)).toBe("unknown");
    expect(umtReleaseReadiness(status([]))).toBe("ready");
  });
});

describe("umtCanRetriggerCstBuild", () => {
  it("disallows retrigger for the same success/in-flight set as umtCanRetriggerBuild", () => {
    expect(umtCanRetriggerCstBuild("SUCCESS")).toBe(false);
    expect(umtCanRetriggerCstBuild("BUILDING")).toBe(false);
    expect(umtCanRetriggerCstBuild("PENDING")).toBe(false);
  });

  it("additionally disallows retrigger when there is no build job", () => {
    expect(umtCanRetriggerCstBuild("NO_BUILD_JOB")).toBe(false);
  });

  it("allows retrigger for a real failure or missing status", () => {
    expect(umtCanRetriggerCstBuild("UNSTABLE")).toBe(true);
    expect(umtCanRetriggerCstBuild(null)).toBe(true);
  });
});
