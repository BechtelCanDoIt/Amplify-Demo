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

import { saveBlob } from "@utils/saveFile";
import type { TilSubmission } from "../api/tilTypes";
import { tilArticlePath } from "./tilArticleView";

// One row per entry, for opening in Google Sheets (File → Import) or Excel.
// "Customer or partner" holds the name for Customer and Partner entries; an
// Other entry's explanation stays beside its source, so the column only ever
// holds customer and partner names.
const HEADER = ["Title", "Source", "Customer or partner", "Author", "Date", "Learning", "Link"];

// A leading =, +, -, @, tab or carriage return can make spreadsheet software
// treat the cell as a formula, so such values are prefixed with a quote.
// Every value here is people's text, never a number of ours. Cells
// containing a quote, comma or line break are wrapped in double quotes, with
// embedded quotes doubled.
function escapeCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

const toRow = (cells: string[]): string => cells.map(escapeCell).join(",");

/** The learning as plain text: one paragraph or list item per line, list
 * items marked "• ", entities decoded. A spreadsheet cell keeps the lines. */
export function tilExportText(html: string): string {
  const marked = html.replace(/<li\b[^>]*>/gi, "$&• ").replace(/<\/(p|li)>|<br\b[^>]*>/gi, "\n");
  const text = new DOMParser().parseFromString(marked, "text/html").body.textContent ?? "";
  return text
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** Local date and time as YYYY-MM-DD HH:mm, which spreadsheets read as a date. */
function exportDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sourceOf(s: TilSubmission): string {
  return s.where === "Other" && s.whereDetail ? `Other: ${s.whereDetail}` : s.where;
}

function customerOrPartnerOf(s: TilSubmission): string {
  return (s.where === "Customer" || s.where === "Partner") && s.whereDetail ? s.whereDetail : "";
}

/** The CSV for `entries`, in the order given. `origin` makes the article
 * links absolute, e.g. "https://one.wso2.com". */
export function buildTilCsv(entries: TilSubmission[], origin: string): string {
  return [
    toRow(HEADER),
    ...entries.map((s) =>
      toRow([
        s.title,
        sourceOf(s),
        customerOrPartnerOf(s),
        s.who,
        exportDate(s.createdAt),
        tilExportText(s.what),
        `${origin}${tilArticlePath(s.id)}`,
      ]),
    ),
  ].join("\r\n");
}

/** today-i-learned-YYYY-MM-DD.csv, dated in local time. */
export function tilExportFilename(now: Date): string {
  return `today-i-learned-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.csv`;
}

export function downloadTilCsv(entries: TilSubmission[], origin: string, now: Date): void {
  // A leading BOM so Excel reads the file as UTF-8 rather than the local
  // codepage; Google Sheets ignores it.
  const blob = new Blob(["\uFEFF", buildTilCsv(entries, origin)], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, tilExportFilename(now));
}
