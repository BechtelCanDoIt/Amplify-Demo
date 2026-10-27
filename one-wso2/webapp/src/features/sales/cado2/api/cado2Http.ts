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

// CadO2's calls on top of @api/http, so the 401 handling, error shape and
// header rules are the shell's. Two shapes @api/http does not offer directly:
// one entry point for a JSON write by method, and a PDF fetched as a Blob.

import { authedDeleteJson, authedPatch, authedPost, authedPut, fetchWithReauth, HttpError } from "@api/http";

/** A JSON write that answers with a JSON body. */
export async function cado2Send<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  switch (method) {
    case "POST":
      return (await authedPost<T>(url, accessToken, body)) as T;
    case "PUT":
      return (await authedPut<T>(url, accessToken, body)) as T;
    case "PATCH":
      return (await authedPatch<T>(url, accessToken, body)) as T;
    case "DELETE":
      return (await authedDeleteJson<T>(url, accessToken, body)) as T;
  }
}

/** Only PDFs are handed to the page; anything else is refused rather than previewed. */
const ALLOWED_FILE_TYPES = new Set(["application/pdf"]);

/**
 * An order form PDF (a preview, or an issued document) as a Blob. A response
 * of any other type is refused: a `blob:` document runs with the app's origin.
 */
export async function cado2Pdf(method: "GET" | "POST", url: string, accessToken: string): Promise<Blob> {
  const res = await fetchWithReauth(url, { method }, accessToken);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HttpError(url, res.status, body);
  }
  const blob = await res.blob();
  const type = (res.headers.get("Content-Type") ?? blob.type).split(";")[0].trim().toLowerCase();
  if (!ALLOWED_FILE_TYPES.has(type)) throw new HttpError(url, res.status, "");
  return blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
}
