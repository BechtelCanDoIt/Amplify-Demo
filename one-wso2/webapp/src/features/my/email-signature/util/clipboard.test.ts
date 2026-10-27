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

import { describe, expect, it } from "vitest";
import { toPlainText } from "./clipboard";

describe("toPlainText", () => {
  it("decodes HTML entities instead of leaving them literal", () => {
    const html = "<table><tbody><tr><td>Jane &amp; Co</td></tr></tbody></table>";
    expect(toPlainText(html)).toBe("Jane & Co");
  });

  it("separates rows with a line break instead of running them together", () => {
    const html =
      "<table><tbody>" +
      "<tr><td>Jane Doe</td></tr>" +
      "<tr><td>R&amp;D, WSO2</td></tr>" +
      "<tr><td>Work: +94 11 234 5678</td></tr>" +
      "</tbody></table>";
    expect(toPlainText(html)).toBe("Jane Doe\nR&D, WSO2\nWork: +94 11 234 5678");
  });

  it("leaves no blank line behind for a row the generator omitted entirely", () => {
    // Mirrors generateSignatureHTML: a blank designation means no <tr> for it
    // at all, not an empty one — the plain-text version shouldn't gain a
    // stray blank line where that row would have been.
    const html =
      "<table><tbody>" +
      "<tr><td>Jane Doe</td></tr>" +
      "<tr><td>Work: +94 11 234 5678</td></tr>" +
      "</tbody></table>";
    expect(toPlainText(html)).toBe("Jane Doe\nWork: +94 11 234 5678");
  });

  it("trims leading and trailing whitespace", () => {
    const html = "<table><tbody><tr><td>  Jane Doe  </td></tr></tbody></table>";
    expect(toPlainText(html)).toBe("Jane Doe");
  });
});
