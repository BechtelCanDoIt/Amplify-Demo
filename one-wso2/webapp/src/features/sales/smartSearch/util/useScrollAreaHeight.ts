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

import { useEffect, useState } from "react";

/** The nearest ancestor that scrolls on its own, or null when the page itself scrolls. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/**
 * How tall the area is that the element scrolls in (less its top padding, which a sticky element keeps clear of), so
 * something that stays in view can be limited to what is really visible. The app scrolls its pages inside a container between the top bar and the footer, so the height of the browser
 * window is too much. Takes the element itself, not a ref, so it measures when the element appears. Undefined until it
 * can be measured; a caller then keeps to its own fallback.
 */
export function useScrollAreaHeight(element: HTMLElement | null): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!element) return;
    const scroller = scrollParent(element);
    const measure = () => {
      // Something that sticks to the top is held back by the area's own padding, so that is not room it can use.
      const padding = scroller ? parseFloat(getComputedStyle(scroller).paddingTop) || 0 : 0;
      const measured = (scroller ? scroller.clientHeight : window.innerHeight) - padding;
      setHeight(measured > 0 ? measured : undefined);
    };
    measure();
    if (!scroller) {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [element]);

  return height;
}
