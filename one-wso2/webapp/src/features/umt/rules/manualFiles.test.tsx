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

// Adding manual files on the PR Analysis step. Nothing is uploaded here: each new row comes with its pending upload, which Analyze
// sends later under the row's path (covered by the PR Analysis step's own
// tests).

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JSZip from "jszip";
import type { UmtPendingManualUpload } from "../lib/umtPrAnalysis";

vi.mock("@context/notifications/NotificationsContext", () => ({
  useNotifications: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() }),
}));

const { default: UmtAddManualFilesSection } = await import(
  "../components/edit/pr-analysis/UmtAddManualFilesSection"
);

function renderSection() {
  const onFilesChange = vi.fn();
  const onBundlesInfoChanged = vi.fn();
  render(
    <UmtAddManualFilesSection
      updateId="42"
      disabled={false}
      files={[]}
      onFilesChange={onFilesChange}
      bundlesInfoChanges={[]}
      onBundlesInfoChanged={onBundlesInfoChanged}
      onDirty={vi.fn()}
    />,
  );
  return { onFilesChange, onBundlesInfoChanged };
}

// Pastes rather than types: per-keystroke typing of these long paths is slow
// enough to hit the test timeout when the whole suite runs in parallel.
async function enter(label: string, text: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.paste(text);
}

async function fillPathAndOperation(path: string, operation: "Added" | "Modified" | "Removed") {
  await userEvent.click(screen.getByRole("button", { name: "Add manual file" }));
  await enter("Path in Product Pack", path);
  await userEvent.click(screen.getByRole("combobox", { name: "Operation" }));
  await userEvent.click(screen.getByRole("option", { name: operation }));
}

function pickFile(file: File) {
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [file] },
  });
}

const pendingUploadsOf = (onFilesChange: ReturnType<typeof vi.fn>) =>
  (onFilesChange.mock.calls[0][1] ?? []) as UmtPendingManualUpload[];

describe("single manual file", () => {
  it("lists the picked file under its path and hands its upload over for Analyze", async () => {
    const { onFilesChange } = renderSection();
    await fillPathAndOperation("repository/components/dropins/foo.jar", "Added");
    const file = new File(["jar"], "foo.jar");
    pickFile(file);

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    expect(onFilesChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({ file: "repository/components/dropins/foo.jar", operation: "Added" }),
    ]);
    expect(pendingUploadsOf(onFilesChange)).toEqual([
      expect.objectContaining({ file, row: expect.objectContaining({ file: "repository/components/dropins/foo.jar" }) }),
    ]);
  });
});

describe("zip of manual files", () => {
  // Analyze stores each upload under its row's path, so the rows must carry
  // the full path in the product pack.
  it("lists each zip entry under the target directory", async () => {
    const zip = new JSZip();
    zip.file("a.jar", "alpha");
    zip.file("lib/b.jar", "beta");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const { onFilesChange } = renderSection();
    await fillPathAndOperation("repository/components/dropins", "Added");
    pickFile(new File([bytes as BlobPart], "patch.zip"));

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    expect(pendingUploadsOf(onFilesChange).map((upload) => upload.row.file).sort()).toEqual([
      "repository/components/dropins/a.jar",
      "repository/components/dropins/lib/b.jar",
    ]);
  });
});

describe("bundle info for a plugin JAR", () => {
  // Opens the dialog for a plugin JAR, which needs a bundle-info entry, and
  // fills that entry in; a blank jarVersion leaves the version field empty.
  async function addPluginJar(jarVersion: string) {
    const section = renderSection();
    await fillPathAndOperation("repository/components/plugins/foo_1.0.0.jar", "Added");
    pickFile(new File(["jar"], "foo_1.0.0.jar"));
    await enter(
      "Bundles Info Path",
      "repository/components/default/configuration/org.eclipse.equinox.simpleconfigurator/bundles.info",
    );
    await enter("JAR Name", "foo");
    if (jarVersion) await enter("JAR Version", jarVersion);
    await enter("Relative JAR Path", "../plugins/foo_1.0.0.jar");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    return section;
  }

  // A bundle-info entry needs a version.
  it("refuses an entry without a JAR version", async () => {
    const { onFilesChange, onBundlesInfoChanged } = await addPluginJar("");

    expect(await screen.findByText("The JAR version is required.")).toBeInTheDocument();
    expect(onFilesChange).not.toHaveBeenCalled();
    expect(onBundlesInfoChanged).not.toHaveBeenCalled();
  });

  it("stores the JAR version trimmed", async () => {
    const { onBundlesInfoChanged } = await addPluginJar(" 1.0.0 ");

    await waitFor(() => expect(onBundlesInfoChanged).toHaveBeenCalled());
    expect(onBundlesInfoChanged.mock.calls[0][0]).toEqual([expect.objectContaining({ jarVersion: "1.0.0" })]);
  });

  // A bundle-info change is either an "add" or a "remove", sent as it is.
  it("sends add or remove as the change type", async () => {
    const { onBundlesInfoChanged } = await addPluginJar("1.0.0");

    await waitFor(() => expect(onBundlesInfoChanged).toHaveBeenCalled());
    const [entry] = onBundlesInfoChanged.mock.calls[0][0] as { entryType: string }[];
    expect(["add", "remove"]).toContain(entry.entryType);
  });
});
