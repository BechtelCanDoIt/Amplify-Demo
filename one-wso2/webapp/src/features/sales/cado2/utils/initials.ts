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

/** Two-letter initials from an e-mail address, e.g. "jane.doe@wso2.com" → "JD". */
export function initialsOf(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase();
}

/** Avatar initials from a name: "Northwind Logistics" → "NL", "marco" → "M", "" → "?". */
export function initialsOfName(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words.length === 1 ? words[0].slice(0, 1) : words[0][0] + words[1][0]).toUpperCase();
}
