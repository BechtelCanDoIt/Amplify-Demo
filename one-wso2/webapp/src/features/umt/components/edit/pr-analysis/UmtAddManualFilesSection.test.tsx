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

// Adding a file never uploads it: the rows come back with their files for the
// step to upload on Analyze. A rejected zip must add nothing, including entries
// that were already unpacked before a later entry failed a check.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JSZip from "jszip";
import type { UmtFileOperation } from "../../../api/umtUpdates";

const state = vi.hoisted(() => ({
  showError: vi.fn(),
}));

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: state.showError, showWarning: vi.fn() }),
}));

const { default: UmtAddManualFilesSection } = await import("./UmtAddManualFilesSection");

/** Builds zip bytes from name-to-content pairs. */
async function zipBytes(files: Record<string, string | Uint8Array>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/** Overwrites every entry's declared uncompressed size, the way a forged archive would. */
function forgeDeclaredSizes(bytes: Uint8Array, size: number): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i + 4 <= bytes.length; i++) {
    const signature = view.getUint32(i, true);
    if (signature === 0x04034b50) view.setUint32(i + 22, size, true);
    else if (signature === 0x02014b50) view.setUint32(i + 24, size, true);
  }
  return bytes;
}

/** Wraps zip bytes in a File, as picked in the dialog. */
function zipFile(bytes: Uint8Array): File {
  return new File([bytes as BlobPart], "patch.zip");
}

/** Opens the Add Manual File dialog, fills it in for `file` and clicks Add. */
async function addZip(file: File, files: UmtFileOperation[] = []) {
  const onFilesChange = vi.fn();
  render(
    <UmtAddManualFilesSection
      updateId="1"
      disabled={false}
      files={files}
      onFilesChange={onFilesChange}
      bundlesInfoChanges={[]}
      onBundlesInfoChanged={vi.fn()}
      onDirty={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Add manual file" }));
  await userEvent.type(screen.getByLabelText("Path in Product Pack"), "repository/components/dropins");
  await userEvent.click(screen.getByRole("combobox", { name: "Operation" }));
  await userEvent.click(screen.getByRole("option", { name: "Added" }));
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [file] },
  });
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
  return { onFilesChange };
}

describe("UmtAddManualFilesSection zip entries", () => {
  beforeEach(() => {
    state.showError.mockClear();
  });

  it("tells the user files are uploaded on Analyze", async () => {
    render(
      <UmtAddManualFilesSection
        updateId="1"
        disabled={false}
        files={[]}
        onFilesChange={vi.fn()}
        bundlesInfoChanges={[]}
        onBundlesInfoChanged={vi.fn()}
        onDirty={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add manual file" }));

    expect(screen.getByText("Files are uploaded when you click Analyze.")).toBeInTheDocument();
  });

  it("adds every entry of a valid zip as a pending upload", async () => {
    const { onFilesChange } = await addZip(zipFile(await zipBytes({ "a.jar": "alpha", "lib/b.jar": "beta" })));

    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    const [rows, uploads] = onFilesChange.mock.calls[0];
    expect(rows.map((row: UmtFileOperation) => row.file)).toEqual([
      "repository/components/dropins/a.jar",
      "repository/components/dropins/lib/b.jar",
    ]);
    expect(uploads).toHaveLength(2);
    expect(uploads[0]).toMatchObject({ row: rows[0], relativePath: "repository/components/dropins" });
  });

  it("refuses a zip entry whose path is already listed", async () => {
    const { onFilesChange } = await addZip(zipFile(await zipBytes({ "a.jar": "alpha" })), [
      { file: "repository/components/dropins/a.jar", operation: "Added" },
    ]);

    expect(await screen.findByText(/"repository\/components\/dropins\/a\.jar" has already been added\./)).toBeInTheDocument();
    expect(onFilesChange).not.toHaveBeenCalled();
  });

  it("adds nothing when a zip contains an unsafe entry path", async () => {
    const { onFilesChange } = await addZip(zipFile(await zipBytes({ "a.jar": "alpha", "lib/../../evil.jar": "bad" })));

    expect(await screen.findByText(/"lib\/\.\.\/\.\.\/evil\.jar" is not a safe path/)).toBeInTheDocument();
    expect(onFilesChange).not.toHaveBeenCalled();
  });

  it("adds nothing when a later entry fails a limit after earlier entries were unpacked", async () => {
    // Every entry declares 10 bytes: the first really is 10 bytes and unpacks
    // fine, the second is 3 MB and is stopped by the running byte count.
    const forged = forgeDeclaredSizes(
      await zipBytes({ "a.jar": "0123456789", "bomb.jar": new Uint8Array(3 * 1024 * 1024) }),
      10,
    );
    const { onFilesChange } = await addZip(zipFile(forged));

    expect(await screen.findByText(/"bomb\.jar" is larger than 2 MB when unzipped/)).toBeInTheDocument();
    expect(onFilesChange).not.toHaveBeenCalled();
  });
});
