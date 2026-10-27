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

/**
 * The part of a product's description worth showing next to its name.
 * Salesforce descriptions often repeat the name first:
 *
 *   name         WSO2 API Control Plane (Managed, Self-hosted) - API Platform
 *   description  WSO2 API Control Plane (Managed, Self-hosted) - API Platform. Based on the number of Managed Distinct APIs.
 *   shown        Based on the number of Managed Distinct APIs.
 *
 * Only an exact repeat (ignoring case) is left out; otherwise the whole
 * description is shown. Null when there is nothing beyond the name.
 */
export function descriptionAfterName(name: string, description: string | null | undefined): string | null {
  const d = description?.trim() ?? "";
  if (!d) return null;
  const n = name.trim();
  if (!n || !d.toLowerCase().startsWith(n.toLowerCase())) return d;
  const rest = d.slice(n.length);
  // Only when the name ends there, not mid-word ("Gateway" in "Gateways …").
  if (rest && !/^[\s.,:;–—-]/.test(rest)) return d;
  return rest.replace(/^[\s.,:;–—-]+/, "") || null;
}
