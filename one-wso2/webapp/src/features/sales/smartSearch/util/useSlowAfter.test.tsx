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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSlowAfter } from "./useSlowAfter";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSlowAfter", () => {
  it("is false at first, and true once the wait has lasted as long as it was given", () => {
    const { result } = renderHook(() => useSlowAfter(true, 10_000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(9_999));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("is false while nothing is going on, however long that lasts", () => {
    const { result } = renderHook(() => useSlowAfter(false, 10_000));
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe(false);
  });

  it("goes back to false the moment the wait is over, and counts again from nothing the next time", () => {
    const { result, rerender } = renderHook(({ active }) => useSlowAfter(active, 10_000), { initialProps: { active: true } });
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(9_000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(true);
  });

  it("leaves no timer behind when it stops", () => {
    const { rerender, unmount } = renderHook(({ active }) => useSlowAfter(active, 10_000), { initialProps: { active: true } });
    expect(vi.getTimerCount()).toBe(1);
    rerender({ active: false });
    expect(vi.getTimerCount()).toBe(0);
    rerender({ active: true });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
