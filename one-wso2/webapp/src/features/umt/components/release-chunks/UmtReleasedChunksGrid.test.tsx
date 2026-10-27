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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const CHUNK = {
  id: 7,
  updateIds: [201, 202],
  updateLevels: [
    { productName: "wso2am", productVersion: "4.2.0", updateLevel: 12, buildStatus: "SUCCESS" },
    { productName: "wso2is", productVersion: "7.0.0", updateLevel: 3, buildStatus: "UNSTABLE" },
  ],
  status: "released",
  releaseMessage: "Monthly release",
  releasedOn: "2026-10-01",
};

function loaded(totalCount: number) {
  return {
    data: { chunks: [CHUNK], totalCount },
    isError: false,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: () => {},
  };
}

const useUmtReleasedChunks = vi.fn();
vi.mock("../../api/useUmtReleaseChunks", () => ({
  useUmtReleasedChunks: (...args: unknown[]) => useUmtReleasedChunks(...args),
}));

const { default: UmtReleasedChunksGrid } = await import("./UmtReleasedChunksGrid");

beforeEach(() => {
  useUmtReleasedChunks.mockReset();
  useUmtReleasedChunks.mockReturnValue(loaded(1));
});

function cellLines(field: string): HTMLElement[] {
  const cell = document.querySelector(`.MuiDataGrid-cell[data-field="${field}"]`);
  if (!cell) throw new Error(`no cell rendered for column "${field}"`);
  const chunkCell = cell.firstElementChild;
  if (!chunkCell) throw new Error(`cell for column "${field}" is empty`);
  return [...chunkCell.children] as HTMLElement[];
}

describe("UmtReleasedChunksGrid", () => {
  it("groups Update Level and Status under an Updates header", () => {
    render(<UmtReleasedChunksGrid />);

    expect(screen.getByText("Updates")).toBeInTheDocument();
    expect(screen.getByText("Update Level")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("puts each level's name and its status chip on matching lines of separate columns", () => {
    render(<UmtReleasedChunksGrid />);

    const levels = cellLines("updateLevels");
    const statuses = cellLines("buildStatus");
    expect(levels).toHaveLength(CHUNK.updateLevels.length);
    expect(statuses).toHaveLength(CHUNK.updateLevels.length);

    expect(levels[0]).toHaveTextContent("wso2am 4.2.0.12");
    expect(levels[0]).not.toHaveTextContent("Successful");
    expect(statuses[0].querySelector(".MuiChip-root")).toHaveTextContent("Successful");
    expect(statuses[1].querySelector(".MuiChip-root")).toHaveTextContent("Unstable");
  });

  it("pages on the server: opens at the first page of 20, counts from the backend's total, and asks for the next page", () => {
    useUmtReleasedChunks.mockReturnValue(loaded(47));
    render(<UmtReleasedChunksGrid />);

    expect(useUmtReleasedChunks).toHaveBeenLastCalledWith({ page: 0, pageSize: 20 });
    expect(screen.getByText("1–20 of 47")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(useUmtReleasedChunks).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
    expect(screen.getByText("21–40 of 47")).toBeInTheDocument();
  });

  it("stays on a page whose request failed, with the error and its Retry still showing", () => {
    useUmtReleasedChunks.mockImplementation(({ page }: { page: number }) =>
      page === 0
        ? loaded(47)
        : {
            data: undefined,
            isError: true,
            isFetching: false,
            isPending: false,
            error: new Error("boom"),
            refetch: () => {},
          },
    );
    render(<UmtReleasedChunksGrid />);

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(useUmtReleasedChunks).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
    expect(screen.getByText("21–40 of 47")).toBeInTheDocument();
    expect(screen.getByText(/^Couldn't load released chunks\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
