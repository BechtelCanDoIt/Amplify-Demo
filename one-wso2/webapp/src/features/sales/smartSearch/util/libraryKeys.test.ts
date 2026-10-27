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

import { afterEach, describe, expect, it } from "vitest";
import { belongsToSomethingElse } from "./libraryKeys";

const page = document.createElement("div");
page.innerHTML = '<button id="in-page">a</button><input id="in-box" /><div role="dialog"><button id="in-dialog">b</button></div>';
const outside = document.createElement("button");

function pressOn(target: EventTarget, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key: "x", bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "target", { value: target });
  return event;
}

afterEach(() => {
  page.remove();
  outside.remove();
});

describe("belongsToSomethingElse", () => {
  document.body.append(page, outside);
  const inPage = (id: string) => page.querySelector(`#${id}`) as HTMLElement;

  it("is false with nothing focused, and for a button on the page", () => {
    expect(belongsToSomethingElse(pressOn(document.body), page)).toBe(false);
    expect(belongsToSomethingElse(pressOn(inPage("in-page")), page)).toBe(false);
  });

  it("is true while a text field is being typed in", () => {
    expect(belongsToSomethingElse(pressOn(inPage("in-box")), page)).toBe(true);
  });

  it("is true inside a dialog, and for anything outside the page", () => {
    expect(belongsToSomethingElse(pressOn(inPage("in-dialog")), page)).toBe(true);
    expect(belongsToSomethingElse(pressOn(outside), page)).toBe(true);
    expect(belongsToSomethingElse(pressOn(document.body), null)).toBe(false);
    expect(belongsToSomethingElse(pressOn(inPage("in-page")), null)).toBe(true);
  });

  it("is true for a shortcut with a modifier key, and for a key something else already handled", () => {
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
      expect(belongsToSomethingElse(pressOn(document.body, init), page)).toBe(true);
    }
    const handled = pressOn(document.body);
    handled.preventDefault();
    expect(belongsToSomethingElse(handled, page)).toBe(true);
  });
});
