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

// Builds the HTML table markup Gmail's rich-text signature box accepts.
// Ported from the standalone Email Group Manager app's
// utils/signatureGenerator.js — table-based layout and inline styles are
// deliberate there and kept here unchanged: Gmail (and most other mail
// clients) strip <style> blocks and much of a document's CSS, so a signature
// that reads correctly in an inbox has to carry every style inline, on a
// <table> rather than flex/grid. This is the one place in the app that trades
// the shared design system for raw HTML, for that reason — this feature has
// no backend of its own; everything here runs client-side.

export interface SignatureData {
  name: string;
  designation: string;
  workPhone: string;
  personalPhone: string;
  medium: string;
  linkedin: string;
  customUrl: string;
  customUrlLabel: string;
}

export const EMPTY_SIGNATURE_DATA: SignatureData = {
  name: "",
  designation: "",
  workPhone: "",
  personalPhone: "",
  medium: "",
  linkedin: "",
  customUrl: "",
  customUrlLabel: "",
};

/** True once there's enough to preview — matches the source app's own gate. */
export function hasSignatureContent(data: SignatureData): boolean {
  return data.name.trim().length > 0 || data.designation.trim().length > 0;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * `javascript:`/`data:` and friends never reach the signature: only an
 * `http(s)://` URL is ever written into an `href`. Same check the source
 * app's SignatureForm used to flag a field red before a round trip that
 * doesn't exist here (there's no backend to reject it) — kept as the
 * generator's own gate too, since this is also where the value lands in
 * markup. Exported so SignatureFieldsForm's live validation and this
 * generator can't drift onto two different definitions of "safe".
 */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function generateSignatureHTML(data: SignatureData): string {
  const socialLinks: string[] = [];
  if (data.medium && isSafeUrl(data.medium)) {
    socialLinks.push(
      `<a href="${escapeHtml(data.medium)}" style="color: #F04E23; text-decoration: none;">Medium</a>`,
    );
  }
  if (data.linkedin && isSafeUrl(data.linkedin)) {
    socialLinks.push(
      `<a href="${escapeHtml(data.linkedin)}" style="color: #F04E23; text-decoration: none;">LinkedIn</a>`,
    );
  }
  if (data.customUrl && data.customUrlLabel && isSafeUrl(data.customUrl)) {
    socialLinks.push(
      `<a href="${escapeHtml(data.customUrl)}" style="color: #F04E23; text-decoration: none;">${escapeHtml(data.customUrlLabel)}</a>`,
    );
  }
  const socialText = socialLinks.join(" | ");

  let phoneText = "";
  if (data.workPhone && data.personalPhone) {
    phoneText = `Work: ${escapeHtml(data.workPhone)} | Mobile: ${escapeHtml(data.personalPhone)}`;
  } else if (data.workPhone) {
    phoneText = `Work: ${escapeHtml(data.workPhone)}`;
  } else if (data.personalPhone) {
    phoneText = `Mobile: ${escapeHtml(data.personalPhone)}`;
  }

  const tdBase = [
    "-webkit-text-size-adjust: 100%",
    "-ms-text-size-adjust: 100%",
    "mso-table-lspace: 0pt",
    "mso-table-rspace: 0pt",
    "background-color: transparent",
  ].join(";");

  const textTd = (extra = "") =>
    `${tdBase};color: #000000 !important;font-family: Inter, Arial, sans-serif;line-height: 1.4;padding: 0 0 3px 0;${extra}`;

  return `<table border="0" cellpadding="0" cellspacing="0" style="${tdBase};font-family: Arial, sans-serif;">
  <tbody>
    <tr>
      <td style="${tdBase};padding: 0;margin: 0;">
        <table border="0" cellpadding="0" cellspacing="0" style="${tdBase};" width="100%">
          <tbody>
            <tr>
              <td style="${tdBase};padding: 0 0 3px 0;">
                <a href="https://wso2.com" style="text-decoration: none;border: 0;display: block;"><img src="https://wso2.cachefly.net/wso2/sites/all/image_resources/logos/wso2-orange-logo.png" alt="WSO2" width="100" height="25" style="-ms-interpolation-mode: bicubic;width: 100px;height: auto;outline: none;text-decoration: none;border: 0;display: block;"></a>
              </td>
            </tr>
            ${
              // Trimmed, matching hasSignatureContent's own gate — a
              // whitespace-only value is "blank" there, so a row it lets
              // through untrimmed would render as a bare bold gap (name) or
              // ", WSO2" with nothing before it (designation).
              data.name.trim()
                ? `<tr>
              <td style="${textTd("font-size: 13px;font-weight: 700;")}">
                <span style="color: #000000 !important;">${escapeHtml(data.name)}</span>
              </td>
            </tr>`
                : ""
            }
            ${
              data.designation.trim()
                ? `<tr>
              <td style="${textTd("font-size: 12px;font-weight: 600;")}">
                <span style="color: #000000 !important;">${escapeHtml(data.designation)}, WSO2</span>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="${tdBase};padding: 0 0 3px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;"><tbody><tr><td height="4" style="background-color: #F14E23; font-size: 0; line-height: 0; padding: 0; height: 4px;"></td></tr></tbody></table>
              </td>
            </tr>
            ${
              phoneText
                ? `<tr>
              <td style="${textTd("font-size: 11px;font-weight: 500;")}">
                <span style="color: #000000 !important;">${phoneText}</span>
              </td>
            </tr>`
                : ""
            }
            ${
              socialText
                ? `<tr>
              <td style="${textTd("font-size: 11px;font-weight: 500;")}">
                <span style="color: #000000 !important;">${socialText}</span>
              </td>
            </tr>`
                : ""
            }
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>`;
}
