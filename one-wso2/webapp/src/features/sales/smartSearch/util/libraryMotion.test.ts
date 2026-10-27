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
import { canAnimate, useTypedText, useTypingPlaceholder } from "./libraryMotion";

function setReducedMotion(reduce: boolean | undefined) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: reduce === undefined ? undefined : () => ({ matches: reduce }),
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  setReducedMotion(undefined);
});

describe("canAnimate", () => {
  it("is off when the browser can't say, and when the person asked for less motion", () => {
    setReducedMotion(undefined);
    expect(canAnimate()).toBe(false);
    setReducedMotion(true);
    expect(canAnimate()).toBe(false);
  });

  it("is on when the person did not ask for less motion", () => {
    setReducedMotion(false);
    expect(canAnimate()).toBe(true);
  });
});

describe("useTypedText", () => {
  const TEXT = "A".repeat(200);

  it("shows everything at once when it is not animating", () => {
    const { result } = renderHook(() => useTypedText(TEXT, false));
    expect(result.current.shown).toBe(TEXT);
    expect(result.current.typing).toBe(false);
  });

  it("types the text out, a little at a time, until it is all there", () => {
    const { result } = renderHook(() => useTypedText(TEXT, true));
    expect(result.current.typing).toBe(true);
    act(() => vi.advanceTimersByTime(180));
    expect(result.current.shown.length).toBeGreaterThan(0);
    expect(result.current.shown.length).toBeLessThan(TEXT.length);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.shown).toBe(TEXT);
    expect(result.current.typing).toBe(false);
  });

  it("shows the rest straight away when skipped", () => {
    const { result } = renderHook(() => useTypedText(TEXT, true));
    act(() => vi.advanceTimersByTime(90));
    act(() => result.current.skip());
    expect(result.current.shown).toBe(TEXT);
    expect(result.current.typing).toBe(false);
  });
});

describe("useTypingPlaceholder", () => {
  const EXAMPLES = ["First question?", "Second question?"];

  it("keeps the first example still when it can't animate", () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useTypingPlaceholder(EXAMPLES, true));
    expect(result.current).toBe("First question?");
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe("First question?");
  });

  it("types one example, holds it, then moves to the next", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useTypingPlaceholder(EXAMPLES, true));
    act(() => vi.advanceTimersByTime(45 * 5));
    expect(result.current).toBe("First");
    act(() => vi.advanceTimersByTime(45 * (EXAMPLES[0].length + 50 - 5 + 6)));
    expect(result.current).toBe("Second");
  });

  it("stops while the box has something in it", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useTypingPlaceholder(EXAMPLES, false));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe("First question?");
  });
});
