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

import { afterEach, describe, expect, it, vi } from "vitest";
import { canCopyRich, escapeHtml, writeToClipboard } from "./libraryCopyText";

describe("escapeHtml", () => {
  it("makes anything that could be read as markup harmless", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  });
});

describe("writeToClipboard", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const write = vi.fn().mockResolvedValue(undefined);

  afterEach(() => {
    vi.unstubAllGlobals();
    writeText.mockClear();
    write.mockClear();
  });

  function setup(rich: boolean) {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: rich ? { writeText, write } : { writeText } });
    if (rich) {
      vi.stubGlobal("ClipboardItem", class { constructor(public items: Record<string, Blob>) {} });
    }
  }

  it("copies the text and the formatted version together when the browser can", async () => {
    setup(true);
    expect(canCopyRich()).toBe(true);
    await writeToClipboard("plain", "<p>rich</p>");
    expect(write).toHaveBeenCalledTimes(1);
    const item = write.mock.calls[0]?.[0][0] as { items: Record<string, Blob> };
    expect(Object.keys(item.items).sort()).toEqual(["text/html", "text/plain"]);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies plain text when there is nothing formatted to add", async () => {
    setup(true);
    await writeToClipboard("plain");
    expect(writeText).toHaveBeenCalledWith("plain");
    expect(write).not.toHaveBeenCalled();
  });

  it("copies plain text when the browser can't do formatted", async () => {
    setup(false);
    expect(canCopyRich()).toBe(false);
    await writeToClipboard("plain", "<p>rich</p>");
    expect(writeText).toHaveBeenCalledWith("plain");
  });

  it("falls back to plain text when the formatted copy is refused", async () => {
    setup(true);
    write.mockRejectedValueOnce(new Error("refused"));
    await writeToClipboard("plain", "<p>rich</p>");
    expect(writeText).toHaveBeenCalledWith("plain");
  });
});
