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

// Putting text on the clipboard, and making text safe to put into formatted (HTML) clipboard content.

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Whether the browser can put formatted text on the clipboard, which is what makes the email's links clickable. */
export const canCopyRich = (): boolean => typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write);

/** Copies the text, and the formatted version beside it when there is one; plain text is the fallback. */
export async function writeToClipboard(text: string, html?: string): Promise<void> {
  if (html && canCopyRich()) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    } catch {
      // Refused or unsupported: the plain text below still works.
    }
  }
  await navigator.clipboard.writeText(text);
}
