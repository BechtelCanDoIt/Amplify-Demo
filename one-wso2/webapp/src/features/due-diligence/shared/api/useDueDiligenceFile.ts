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
import { fetchWithReauth, HttpError } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { dueDiligenceServiceUrls } from "@config/apiConfig";

// Only these types are ever previewed inline. Anything else is coerced to
// octet-stream before creating the object URL — ViewPdfPage puts this URL
// straight into an <iframe src>, and a blob: document of type text/html
// runs same-origin with the app, so a partner-uploaded HTML file (saved
// under a misleading .pdf/.jpg name, or simply served with a wrong
// Content-Type) could otherwise execute with access to the session. Same
// guard as @features/finance/util/financeReceipts's `safeType`.
const PREVIEWABLE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function safeType(type: string): string {
  return PREVIEWABLE_TYPES.has(type) ? type : "application/octet-stream";
}

/**
 * Fetches a stored due-diligence document (GET /files/{fileName}, a raw
 * binary endpoint behind the same JwtInterceptor as everything else — not
 * an <img src>-able URL) as an object URL for inline viewing. Same pattern
 * as @features/finance/util/financeReceipts's fetchReceiptObjectUrl.
 */
export function useDueDiligenceFile(fileName: string | null, extension: string | null) {
  const getAccessToken = useAccessToken();
  const [state, setState] = useState<{ objectUrl?: string; isLoading: boolean; error?: string }>({
    isLoading: Boolean(fileName && extension),
  });

  useEffect(() => {
    if (!fileName || !extension) return;
    let cancelled = false;
    let createdUrl: string | undefined;
    setState({ isLoading: true });
    void (async () => {
      try {
        const accessToken = await getAccessToken();
        const res = await fetchWithReauth(dueDiligenceServiceUrls.file(fileName, extension), {}, accessToken);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new HttpError(dueDiligenceServiceUrls.file(fileName, extension), res.status, body);
        }
        const blob = await res.blob();
        if (cancelled) return;
        const type = safeType(blob.type);
        // Re-wrap when coercing so the object URL carries the safe type,
        // never the original (possibly text/html) one.
        const safeBlob = type === blob.type ? blob : new Blob([blob], { type });
        createdUrl = URL.createObjectURL(safeBlob);
        setState({ objectUrl: createdUrl, isLoading: false });
      } catch (err) {
        if (cancelled) return;
        setState({ isLoading: false, error: err instanceof Error ? err.message : "Couldn't load the document." });
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileName, extension, getAccessToken]);

  return state;
}
