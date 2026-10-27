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

import type { UmtReleaseChunkBuildStatus } from "../api/umtReleaseChunks";
import type { UmtUpdateSummary } from "../api/umtUpdates";

// The page sizes offered by the pending and released grids, which page on the
// server alike. The first is the size each opens at.
export const UMT_CHUNK_PAGE_SIZE_OPTIONS = [20, 30, 50];

// How a build status reads on screen. The backend's vocabulary is open-ended,
// so anything not listed below — including a status that never arrived — is
// reported as a failure rather than silently rendering as blank.
//
// Two of these are the same state under two names: a product or TG build in
// flight reports BUILDING and one that finished reports SUCCESS, while the
// CST build reports IN_PROGRESS and SUCCEEDED for the same two things. Both
// spellings are listed because a running build that read as a failure would
// send someone chasing a problem that isn't there.
//
// One colour per status, carried by the chip's outline and its text alike.
// The colours have to hold up without a fill behind them, so the two that are
// merely waiting (not triggered, no build job) are greys, and the two that
// are unfinished business (pending, unstable) are ambers kept far enough
// apart to tell apart at a glance.
export interface UmtBuildStatusChip {
  text: string;
  color: string;
  /** Draws an inline spinner inside the chip, for a build still running. */
  pulsing?: boolean;
}

const BUILD_STATUS_CHIPS: Record<string, UmtBuildStatusChip> = {
  BUILDING: { text: "Building", color: "#1E88E5", pulsing: true },
  IN_PROGRESS: { text: "Building", color: "#1E88E5", pulsing: true },
  SUCCESS: { text: "Successful", color: "#409200" },
  SUCCEEDED: { text: "Successful", color: "#409200" },
  PENDING: { text: "Pending", color: "#F57C00" },
  UNKNOWN: { text: "Not Triggered", color: "#989898" },
  UNSTABLE: { text: "Unstable", color: "#B36B00" },
  NO_BUILD_JOB: { text: "No Build Job", color: "#757575" },
};

const FAILED_BUILD_STATUS_CHIP: UmtBuildStatusChip = {
  text: "Failed",
  color: "#F64E60",
};

export function umtBuildStatusChip(status: string | null | undefined): UmtBuildStatusChip {
  return (status && BUILD_STATUS_CHIPS[status]) || FAILED_BUILD_STATUS_CHIP;
}

// Whether a build can be retriggered. There is nothing to retry while a build
// is queued or running; everything else — a failure, an unstable result, or a
// build that was never triggered at all — can be asked for again. Both names
// for a running build are listed, so a cell never shows a "Building" chip and
// a retrigger button side by side.
const NON_RETRIGGERABLE_BUILD_STATUSES = new Set([
  "SUCCESS",
  "BUILDING",
  "IN_PROGRESS",
  "PENDING",
]);

export function umtCanRetriggerBuild(status: string | null | undefined): boolean {
  return !status || !NON_RETRIGGERABLE_BUILD_STATUSES.has(status);
}

// The CST build adds two of its own: it reports success as SUCCEEDED rather
// than SUCCESS, and NO_BUILD_JOB means there is no job to retrigger at all.
const NON_RETRIGGERABLE_CST_BUILD_STATUSES = new Set([
  ...NON_RETRIGGERABLE_BUILD_STATUSES,
  "SUCCEEDED",
  "NO_BUILD_JOB",
]);

export function umtCanRetriggerCstBuild(status: string | null | undefined): boolean {
  return !status || !NON_RETRIGGERABLE_CST_BUILD_STATUSES.has(status);
}

// What a pending chunk offers its administrator, decided entirely by the
// chunk's own lifecycle status. A chunk in a status not listed here — one
// already released, or still being created — offers nothing, because every
// action below either acts on a finished chunk or retries a failed step.
export type UmtReleaseChunkRowAction =
  | { kind: "release"; failedReason?: string | null }
  | { kind: "docker-retrigger"; failedReason?: string | null }
  | { kind: "in-progress" }
  | { kind: "created" }
  | { kind: "none" };

export function umtReleaseChunkRowAction(
  status: string | null | undefined,
  failedReason?: string | null,
): UmtReleaseChunkRowAction {
  switch (status) {
    case "releasingFailed":
      return { kind: "release", failedReason };
    case "releasingDockerFailed":
      return { kind: "docker-retrigger", failedReason };
    case "releasing":
    case "retriggering":
      return { kind: "in-progress" };
    case "created":
      return { kind: "created" };
    default:
      return { kind: "none" };
  }
}

// Whether a chunk may be released. A release goes out only when every one of
// its update levels has built successfully, so a chunk with a failed or
// unstable build is blocked until the relevant teams get it green.
//
// A build status that could not be read is its own answer, not a release.
// Collapsing it into "ready" is the trap worth naming: `[].every(...)` is
// `true`, so treating a missing status as an empty list of levels would let a
// chunk through the very check meant to stop it.
export type UmtReleaseReadiness = "ready" | "blocked" | "unknown";

export function umtReleaseReadiness(
  buildStatus: UmtReleaseChunkBuildStatus | undefined,
): UmtReleaseReadiness {
  if (!buildStatus) return "unknown";
  return buildStatus.updateLevels.every((level) => level.buildStatus === "SUCCESS")
    ? "ready"
    : "blocked";
}

function updateProductVersions(updates: UmtUpdateSummary[]): { name: string; version: string }[] {
  return updates.flatMap((update) =>
    (update.products ?? []).flatMap((item) => {
      const name = item.product?.name;
      const version = item.product?.version;
      return name && version ? [{ name, version }] : [];
    }),
  );
}

// A product version travels as X.Y.Z.<update level>.<channel>; two updates
// collide on the product's base X.Y.Z, whatever level each carries.
function umtBaseVersion(version: string): string {
  return /^\d+\.\d+\.\d+/.exec(version)?.[0] ?? version;
}

// The Create Release Chunk page's "already in UAT" guard. A UATStaging update
// cannot be promoted while another update for the same product and base
// version is still sitting in UAT — that one has to be released first, or the
// two would race for the same update level. Names match case-insensitively.
// Returns the blocking product names, de-duplicated, for the dialog that
// explains the refusal.
export function umtReleaseChunkCollisionProducts(
  selectedUpdates: UmtUpdateSummary[],
  uatUpdates: UmtUpdateSummary[],
): string[] {
  const productKey = (product: { name: string; version: string }) =>
    `${product.name.toLowerCase()} ${umtBaseVersion(product.version)}`;
  const uatKeys = new Set(updateProductVersions(uatUpdates).map(productKey));
  const blocking = updateProductVersions(selectedUpdates).filter((selected) => uatKeys.has(productKey(selected)));
  return [...new Set(blocking.map((product) => product.name))];
}
