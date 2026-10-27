// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useChunkGridPagination } from "./useChunkGridPagination";

type Page = { data?: { totalCount: number } };

describe("useChunkGridPagination", () => {
  it("opens on the first page at the first page size and loads that page", () => {
    const useChunksPage = vi.fn((): Page => ({ data: { totalCount: 47 } }));
    const { result } = renderHook(() => useChunkGridPagination(useChunksPage));

    expect(useChunksPage).toHaveBeenLastCalledWith({ page: 0, pageSize: 20 });
    expect(result.current.gridProps).toMatchObject({
      paginationMode: "server",
      paginationModel: { page: 0, pageSize: 20 },
      pageSizeOptions: [20, 30, 50],
      rowCount: 47,
    });
  });

  it("loads whichever page the grid moves to, and returns the query's result untouched", () => {
    const page: Page = { data: { totalCount: 47 } };
    const useChunksPage = vi.fn((): Page => page);
    const { result } = renderHook(() => useChunkGridPagination(useChunksPage));

    act(() => result.current.gridProps.onPaginationModelChange({ page: 2, pageSize: 30 }));

    expect(useChunksPage).toHaveBeenLastCalledWith({ page: 2, pageSize: 30 });
    expect(result.current.gridProps.paginationModel).toEqual({ page: 2, pageSize: 30 });
    expect(result.current.chunks).toBe(page);
  });

  it("keeps the last known row count while a page has no data", () => {
    let current: Page = { data: { totalCount: 47 } };
    const { result, rerender } = renderHook(() => useChunkGridPagination(() => current));
    expect(result.current.gridProps.rowCount).toBe(47);

    current = {};
    rerender();

    expect(result.current.gridProps.rowCount).toBe(47);
  });
});
