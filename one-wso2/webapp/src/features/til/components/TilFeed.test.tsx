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
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { TilSubmission } from "../api/tilTypes";
import { TIL_FEED_LAYOUTS, type TilFeedLayout } from "../util/tilFeedLayout";
import TilFeed from "./TilFeed";

// An entry saved while pictures were still allowed: the feed must not show it.
const PICTURE = "https://til.example.com/uploads/plan.png";

const MINE: TilSubmission = {
  id: "mine",
  title: "Idempotency keys make client retries safe",
  who: "Dana Sample",
  where: "Other",
  whereDetail: "Book: Designing Data-Intensive Applications",
  what: `<p>A retry can apply a write twice.</p><p><img src="${PICTURE}"></p>`,
  submittedByEmail: "dana@example.com",
  createdAt: new Date("2026-10-07T14:34:13Z"),
  updatedAt: new Date("2026-10-08T09:00:00Z"),
  notifiedAt: new Date("2026-10-07T14:34:14Z"),
};

const THEIRS: TilSubmission = {
  id: "theirs",
  title: "Ask for the token lifetimes first",
  who: "Alex Sample",
  where: "Customer",
  whereDetail: "Acme Bank (sample)",
  what: "<p>Their access token lived for 5 minutes.</p>",
  submittedByEmail: "alex@example.com",
  createdAt: new Date("2026-10-04T15:34:13Z"),
  updatedAt: null,
  notifiedAt: null,
};

function renderFeed(layout: TilFeedLayout) {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onOpen: vi.fn() };
  render(
    <TilFeed
      layout={layout}
      submissions={[MINE, THEIRS]}
      canChange={(s) => s.id === "mine"}
      deletingId={null}
      {...handlers}
    />,
  );
  return handlers;
}

describe.each(TIL_FEED_LAYOUTS)("TilFeed in the %s layout", (layout) => {
  it("shows every entry", () => {
    renderFeed(layout);
    expect(screen.getByText(MINE.title)).toBeInTheDocument();
    expect(screen.getByText(THEIRS.title)).toBeInTheDocument();
  });

  it("offers edit and delete only on entries the viewer can change", () => {
    renderFeed(layout);
    expect(screen.getAllByRole("button", { name: "Edit entry" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete entry" })).toHaveLength(1);
  });

  it("opens an entry on click, but not from its edit or delete buttons", () => {
    const { onEdit, onDelete, onOpen } = renderFeed(layout);
    fireEvent.click(screen.getByRole("button", { name: "Edit entry" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete entry" }));
    expect(onEdit).toHaveBeenCalledWith(MINE);
    expect(onDelete).toHaveBeenCalledWith("mine");
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(THEIRS.title));
    expect(onOpen).toHaveBeenCalledWith("theirs");
  });

  it("opens an entry with Enter", () => {
    const { onOpen } = renderFeed(layout);
    const links = screen.getAllByRole("link");
    fireEvent.keyDown(links[1], { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("theirs");
  });
});

describe("TilFeed pictures", () => {
  it.each(TIL_FEED_LAYOUTS)("shows no pictures in the %s layout, even from an entry that holds one", (layout) => {
    const { container } = render(
      <TilFeed layout={layout} submissions={[MINE, THEIRS]} canChange={() => false} deletingId={null} onEdit={vi.fn()} onDelete={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it.each(["small", "large"] as const)("gives each entry its source cover in the %s layout", (layout) => {
    const { container } = render(
      <TilFeed layout={layout} submissions={[MINE]} canChange={() => false} deletingId={null} onEdit={vi.fn()} onDelete={vi.fn()} onOpen={vi.fn()} />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
