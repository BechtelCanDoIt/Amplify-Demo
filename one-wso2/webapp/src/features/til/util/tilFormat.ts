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

/** "Oct 4, 2026" — the byline date on the article and the compact feed layouts. */
export function tilShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Up to two initials for an author's avatar: "Alex Sample" → "AS". */
export function tilInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** sx that clamps text to `lines` lines, ending the last in an ellipsis. */
export function tilLineClamp(lines: number) {
  return { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } as const;
}
