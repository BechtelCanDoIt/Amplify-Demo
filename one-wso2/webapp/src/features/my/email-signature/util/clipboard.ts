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

// Ported from the source app's utils/clipboard.js. Writes BOTH a text/html
// and a text/plain representation of the same content: pasting into Gmail's
// signature box (or any rich-text target) needs the html/style-carrying
// version, while a plain-text target (a chat box, a code editor) gets a
// readable fallback instead of raw markup — a single-mimetype `writeText`
// can only ever satisfy one of the two.

/**
 * Derives a readable plain-text version of the signature's HTML.
 *
 * A bare tag-strip (`html.replace(/<[^>]*>/g, "")`) leaves two things wrong:
 * it does nothing about the HTML entities `escapeHtml` deliberately
 * introduced (so "Jane & Co" comes back as "Jane &amp; Co"), and it inserts
 * nothing where a table row ended, so every row runs into the next
 * ("Jane &amp; CoR&amp;D, WSO2Work: ..."). Parsing the HTML properly (via
 * `DOMParser`) and reading `.textContent` decodes entities as a side effect
 * of real HTML parsing; inserting a newline at each `</tr>` first is what
 * keeps rows apart once tags are gone.
 */
export function toPlainText(html: string): string {
  const withRowBreaks = html.replace(/<\/tr>/gi, "</tr>\n");
  const text = new DOMParser().parseFromString(withRowBreaks, "text/html").body.textContent ?? "";
  return text
    .replace(/[ \t]+\n/g, "\n") // trailing spaces before a line break
    .replace(/\n{2,}/g, "\n") // a row omitted entirely (e.g. blank designation) leaves no blank line behind
    .trim();
}

export async function copyRichText(html: string): Promise<boolean> {
  try {
    if (typeof window.ClipboardItem === "undefined") return false;
    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([toPlainText(html)], { type: "text/plain" });
    await navigator.clipboard.write([
      new window.ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
