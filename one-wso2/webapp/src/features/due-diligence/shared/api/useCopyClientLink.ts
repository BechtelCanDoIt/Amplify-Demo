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

import { useDueDiligenceAppConfig } from "@features/due-diligence/api/useDueDiligenceAppConfig";

/**
 * Copies a reseller/trade-reference form link to the clipboard — a port of
 * Resellers.js's copyURL() / TradeReferences.js's copyURL(), except the
 * client webapp's base URL now comes from the due-diligence backend's own
 * GET /app-config (see useDueDiligenceAppConfig) instead of a One WSO2
 * config key, so there is one place — the backend's deployment config —
 * that knows where the client app actually lives.
 */
export function useCopyClientLink() {
  const appConfig = useDueDiligenceAppConfig();

  const copy = async (
    form: "resellerform" | "tradereferenceform",
    encodeString: string,
  ): Promise<{ ok: boolean; message: string }> => {
    const base = appConfig.data?.clientBaseUrl;
    if (!base) {
      return {
        ok: false,
        message: appConfig.isError
          ? "Couldn't check where the client app is hosted."
          : "The client app's URL isn't configured yet.",
      };
    }
    const url = `${base.replace(/\/+$/, "")}/${form}/validate/${encodeString}`;
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, message: "Copied to clipboard" };
    } catch {
      return { ok: false, message: "Failed to copy to clipboard" };
    }
  };

  return { copy, isResolving: appConfig.isPending };
}
