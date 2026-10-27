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

import { createContext, useContext } from "react";
import type { Issue } from "@features/sales/cado2/quotes/api/quoteTypes";

/**
 * Problems to show next to their fields: a refused save (422) or a refused
 * live preview. Missing-information issues are listed only in the summary
 * panel, so a brand-new quote isn't covered in red.
 */
export const FieldIssuesContext = createContext<ReadonlyMap<string, string>>(new Map());

/** The message for a field, if the backend reported one. */
export function useFieldIssue(field: string): string | undefined {
  return useContext(FieldIssuesContext).get(field);
}

/** Builds the field → message map (first message per field). */
export function issueMap(issues: readonly Issue[]): ReadonlyMap<string, string> {
  const m = new Map<string, string>();
  for (const i of issues) if (!m.has(i.field)) m.set(i.field, i.message);
  return m;
}
