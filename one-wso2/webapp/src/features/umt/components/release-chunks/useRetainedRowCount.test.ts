// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy at
// http://www.apache.org/licenses/LICENSE-2.0

import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRetainedRowCount } from "./useRetainedRowCount";

describe("useRetainedRowCount", () => {
  it("is 0 before any page has reported a count", () => {
    const { result } = renderHook(() => useRetainedRowCount(undefined));
    expect(result.current).toBe(0);
  });

  it("keeps the last known count while a page has none, so a failed page cannot reset the grid to page 1", () => {
    const { result, rerender } = renderHook(({ total }) => useRetainedRowCount(total), {
      initialProps: { total: 47 as number | undefined },
    });
    expect(result.current).toBe(47);

    rerender({ total: undefined });
    expect(result.current).toBe(47);
  });

  it("follows the count when a page reports a new one, including a smaller one", () => {
    const { result, rerender } = renderHook(({ total }) => useRetainedRowCount(total), {
      initialProps: { total: 47 as number | undefined },
    });

    rerender({ total: 21 });
    expect(result.current).toBe(21);

    rerender({ total: undefined });
    expect(result.current).toBe(21);
  });
});
