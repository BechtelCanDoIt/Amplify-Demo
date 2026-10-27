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
import {
  EMPTY_SIGNATURE_DATA,
  generateSignatureHTML,
  hasSignatureContent,
  type SignatureData,
} from "./signatureGenerator";

function data(overrides: Partial<SignatureData> = {}): SignatureData {
  return { ...EMPTY_SIGNATURE_DATA, ...overrides };
}

describe("hasSignatureContent", () => {
  it("false when both name and designation are blank", () => {
    expect(hasSignatureContent(data())).toBe(false);
    expect(hasSignatureContent(data({ name: "   " }))).toBe(false);
  });

  it("true once either is filled in", () => {
    expect(hasSignatureContent(data({ name: "Jane Doe" }))).toBe(true);
    expect(hasSignatureContent(data({ designation: "Engineer" }))).toBe(true);
  });
});

describe("generateSignatureHTML", () => {
  it("escapes the name and designation", () => {
    const html = generateSignatureHTML(data({ name: "<b>Jane</b>", designation: "R&D" }));
    expect(html).toContain("&lt;b&gt;Jane&lt;/b&gt;");
    expect(html).toContain("R&amp;D, WSO2");
    expect(html).not.toContain("<b>Jane</b>");
  });

  it("omits the designation row entirely when blank", () => {
    const html = generateSignatureHTML(data({ name: "Jane Doe" }));
    expect(html).not.toContain(", WSO2");
  });

  it("omits the name row entirely when blank, rather than an empty bold row", () => {
    const html = generateSignatureHTML(data({ designation: "Software Engineer" }));
    expect(html).not.toContain('<span style="color: #000000 !important;"></span>');
    expect(html).toContain("Software Engineer, WSO2");
  });

  it("treats a whitespace-only name the same as blank", () => {
    const html = generateSignatureHTML(data({ name: "   ", designation: "Software Engineer" }));
    expect(html).not.toContain('<span style="color: #000000 !important;"></span>');
    expect(html).toContain("Software Engineer, WSO2");
  });

  it("treats a whitespace-only designation the same as blank", () => {
    const html = generateSignatureHTML(data({ name: "Jane Doe", designation: "   " }));
    expect(html).not.toContain(", WSO2");
  });

  it("combines work and personal phone with a separator", () => {
    const html = generateSignatureHTML(
      data({ name: "Jane", workPhone: "+94 11 000 0000", personalPhone: "+94 77 000 0000" }),
    );
    expect(html).toContain("Work: +94 11 000 0000 | Mobile: +94 77 000 0000");
  });

  it("shows only the phone that's filled in", () => {
    expect(generateSignatureHTML(data({ name: "Jane", workPhone: "+94 11 000 0000" }))).toContain(
      "Work: +94 11 000 0000",
    );
    expect(
      generateSignatureHTML(data({ name: "Jane", workPhone: "+94 11 000 0000" })),
    ).not.toContain("Mobile:");
  });

  it("drops a medium/linkedin/custom link whose URL isn't http(s)", () => {
    const html = generateSignatureHTML(
      data({ name: "Jane", medium: "javascript:alert(1)", linkedin: "not-a-url" }),
    );
    expect(html).not.toContain("Medium");
    expect(html).not.toContain("LinkedIn");
  });

  it("requires both the custom URL and its label", () => {
    const withoutLabel = generateSignatureHTML(
      data({ name: "Jane", customUrl: "https://github.com/jane" }),
    );
    expect(withoutLabel).not.toContain("github.com");

    const withLabel = generateSignatureHTML(
      data({ name: "Jane", customUrl: "https://github.com/jane", customUrlLabel: "GitHub" }),
    );
    expect(withLabel).toContain('href="https://github.com/jane"');
    expect(withLabel).toContain(">GitHub<");
  });

  it("joins multiple social links with a separator", () => {
    const html = generateSignatureHTML(
      data({
        name: "Jane",
        medium: "https://medium.com/@jane",
        linkedin: "https://linkedin.com/in/jane",
      }),
    );
    expect(html).toContain(">Medium</a> | <a");
  });

  it("escapes an unsafe-looking but non-URL custom label", () => {
    const html = generateSignatureHTML(
      data({
        name: "Jane",
        customUrl: "https://example.com",
        customUrlLabel: '<script>alert(1)</script>',
      }),
    );
    expect(html).not.toContain("<script>");
  });
});
