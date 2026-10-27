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

import { useState, type JSX } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useScrollAreaHeight } from "./useScrollAreaHeight";

function Probe(): JSX.Element {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const height = useScrollAreaHeight(element);
  return (
    <div ref={setElement} data-testid="probe">
      {String(height)}
    </div>
  );
}

// jsdom has no layout, so the scrolling area's height is given to it.
function inScroller(clientHeight: number, style = "overflow-y: auto; padding-top: 24px") {
  const scroller = document.createElement("div");
  scroller.setAttribute("style", style);
  Object.defineProperty(scroller, "clientHeight", { configurable: true, value: clientHeight });
  document.body.appendChild(scroller);
  return render(<Probe />, { container: scroller.appendChild(document.createElement("div")) });
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("useScrollAreaHeight", () => {
  it("is the height of the area the page scrolls in, less its top padding", () => {
    inScroller(600);
    expect(screen.getByTestId("probe").textContent).toBe("576");
  });

  it("finds the scrolling area however far up it is, and also when it is set to scroll", () => {
    const outer = document.createElement("div");
    outer.setAttribute("style", "overflow-y: scroll");
    Object.defineProperty(outer, "clientHeight", { configurable: true, value: 500 });
    const middle = outer.appendChild(document.createElement("section"));
    document.body.appendChild(outer);
    render(<Probe />, { container: middle.appendChild(document.createElement("div")) });
    expect(screen.getByTestId("probe").textContent).toBe("500");
  });

  it("is the height of the window when the page itself scrolls", () => {
    vi.stubGlobal("innerHeight", 700);
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("700");
  });

  it("is unknown rather than zero when it can't be measured", () => {
    inScroller(0);
    expect(screen.getByTestId("probe").textContent).toBe("undefined");
  });

  it("follows the area when it changes size", () => {
    let notify: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    inScroller(600);
    expect(screen.getByTestId("probe").textContent).toBe("576");
    const scroller = document.body.firstElementChild as HTMLElement;
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 400 });
    act(() => notify());
    expect(screen.getByTestId("probe").textContent).toBe("376");
  });

  it("follows the window when the page itself scrolls and the window is resized", () => {
    vi.stubGlobal("innerHeight", 700);
    render(<Probe />);
    vi.stubGlobal("innerHeight", 500);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByTestId("probe").textContent).toBe("500");
  });
});
