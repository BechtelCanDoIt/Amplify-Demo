// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

// Changing the worst-case estimate needs a reason: the backend quotes it in the
// updated-ETA comment on the customer's case and the update's issues, and
// doesn't refuse a change without one itself.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UmtUpdateFieldChange } from "../api/useUmtUpdateFieldMutation";

vi.mock("../api/useUmtWorstCaseEstimateLog", () => ({
  useUmtWorstCaseEstimateLog: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}));

const { default: UmtUpdateDetailsGrid } = await import("./UmtUpdateDetailsGrid");

function renderGrid() {
  const onSave = vi.fn<(change: UmtUpdateFieldChange) => Promise<void>>(async () => undefined);
  render(
    <UmtUpdateDetailsGrid
      id="42"
      update={{ id: 42, lifecycleState: "Development", worstCaseEstimate: "2026-11-05T00:00:00Z" }}
      loading={false}
      canEdit
      onSave={onSave}
    />,
  );
  return { onSave };
}

async function openWorstCaseEditor() {
  await userEvent.click(screen.getByRole("button", { name: "Edit Worst Case Date" }));
}

async function enterReason(text: string) {
  await userEvent.click(screen.getByRole("textbox", { name: /Reason for the change/ }));
  await userEvent.paste(text);
}

const saveButton = () => screen.getByRole("button", { name: "Save Worst Case Date" });

describe("worst-case estimate editor", () => {
  it("holds Save until a reason is given", async () => {
    renderGrid();
    await openWorstCaseEditor();

    expect(saveButton()).toBeDisabled();
  });

  it("treats a whitespace-only reason as none", async () => {
    renderGrid();
    await openWorstCaseEditor();

    await enterReason("   ");

    expect(saveButton()).toBeDisabled();
  });

  it("saves the date together with its reason", async () => {
    const { onSave } = renderGrid();
    await openWorstCaseEditor();

    await enterReason("Blocked on a dependency release");
    await userEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith({
      field: "worstCaseEstimate",
      value: "2026-11-05",
      reason: "Blocked on a dependency release",
    });
  });

  it("starts each edit with an empty reason", async () => {
    renderGrid();
    await openWorstCaseEditor();
    await enterReason("First thought");
    await userEvent.click(screen.getByRole("button", { name: "Cancel editing Worst Case Date" }));

    await openWorstCaseEditor();

    expect(screen.getByRole("textbox", { name: /Reason for the change/ })).toHaveValue("");
  });
});
