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

// Release chunk rules: which updates can be chunked together, and how a chunk's
// state is shown.

import { describe, expect, it } from "vitest";
import type { UmtUpdateSummary } from "../api/umtUpdates";
import { mapUmtReleaseChunk } from "../api/umtReleaseChunks";
import { umtReleaseChunkCollisionProducts, umtReleaseChunkRowAction } from "../lib/umtReleaseChunks";

function update(id: number, name: string, version: string): UmtUpdateSummary {
  return { id, products: [{ product: { name, version } }] };
}

describe("UAT collision", () => {
  it("blocks a product whose same version is already in UAT, and nothing else", () => {
    expect(
      umtReleaseChunkCollisionProducts([update(1, "wso2am", "4.2.0.15.full")], [update(2, "wso2am", "4.2.0.15.full")]),
    ).toEqual(["wso2am"]);
    expect(
      umtReleaseChunkCollisionProducts([update(1, "wso2am", "4.2.0.15.full")], [update(2, "wso2is", "4.2.0.15.full")]),
    ).toEqual([]);
    expect(
      umtReleaseChunkCollisionProducts([update(1, "wso2am", "4.2.0.15.full")], [update(2, "wso2am", "4.3.0.2.full")]),
    ).toEqual([]);
  });

  // Products travel as X.Y.Z.<level>.<channel>. The base version and the name,
  // case-insensitively, decide a collision, so an update at level 15 can't be
  // chunked while level 14 of the same product still sits in UAT.
  it("compares base versions, not full update-level versions", () => {
    expect(
      umtReleaseChunkCollisionProducts([update(1, "wso2am", "4.2.0.15.full")], [update(2, "wso2am", "4.2.0.14.full")]),
    ).toEqual(["wso2am"]);
  });

  it("compares product names case-insensitively", () => {
    expect(
      umtReleaseChunkCollisionProducts([update(1, "wso2am", "4.2.0.15.full")], [update(2, "WSO2AM", "4.2.0.15.full")]),
    ).toEqual(["wso2am"]);
  });
});

describe("chunk row action", () => {
  it("offers Release on a created or release-failed chunk and shows progress while releasing", () => {
    expect(umtReleaseChunkRowAction("created").kind).toBe("created");
    expect(umtReleaseChunkRowAction("releasingFailed").kind).toBe("release");
    expect(umtReleaseChunkRowAction("releasing").kind).toBe("in-progress");
  });
});

describe("chunk mapping", () => {
  // Retriggers must post the level's own channel.
  it("keeps each update level's channel", () => {
    const chunk = mapUmtReleaseChunk({
      id: 1,
      updateIds: [10],
      updateLevels: [{ "product-name": "wso2am", "product-version": "4.2.0", channel: "security" } as never],
    });
    expect(chunk.updateLevels[0]).toMatchObject({ channel: "security" });
  });
});
