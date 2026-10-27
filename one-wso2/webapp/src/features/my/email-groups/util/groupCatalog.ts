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

// Pure functions turning the three raw group-name arrays into what the page
// renders. Kept apart from the hooks that fetch them so the derivation itself
// — which list a group lands in, and which rows survive a filter — is
// testable without a QueryClient.

import type {
  GroupCatalog,
  GroupCategoryFilter,
  MyGroupRow,
  PublicGroup,
} from "../api/emailGroupTypes";

/**
 * Build the three-list catalog from the raw responses.
 *
 * A group is, in order: a DEFAULT group if the source app's default list
 * names it (default always wins — the source backend doesn't guarantee the
 * three lists are disjoint, and a group that is both default and public is
 * not a real choice); otherwise a PUBLIC entry if it's in the directory,
 * carrying whether the caller is subscribed; otherwise, if the caller is
 * subscribed to it, a PRIVATE group — one they hold that isn't offered
 * through self-service at all.
 */
export function buildGroupCatalog(
  defaultGroups: readonly string[],
  allGroups: readonly string[],
  userGroups: readonly string[],
): GroupCatalog {
  const defaults = new Set(defaultGroups);
  const directory = new Set(allGroups);
  const subscribed = new Set(userGroups);

  const publicGroups: PublicGroup[] = allGroups
    .filter((name) => !defaults.has(name))
    .map((name) => ({ name, isSubscribed: subscribed.has(name) }));

  const privateGroups = userGroups.filter((name) => !defaults.has(name) && !directory.has(name));

  return { defaultGroups: [...defaultGroups], publicGroups, privateGroups };
}

/** Case-insensitive substring match on the group's address. */
function matchesSearch(name: string, search: string): boolean {
  if (!search.trim()) return true;
  return name.toLowerCase().includes(search.trim().toLowerCase());
}

/** The public-directory rows the caller has NOT opted into — the ones left to join. */
export function joinablePublicGroups(groups: readonly PublicGroup[]): PublicGroup[] {
  return groups.filter((g) => !g.isSubscribed);
}

/** Search over the joinable-directory list. */
export function filterPublicGroupsBySearch(
  groups: readonly PublicGroup[],
  search: string,
): PublicGroup[] {
  return groups.filter((g) => matchesSearch(g.name, search));
}

/**
 * "My Groups": everything the caller is already subscribed to, tagged by
 * origin and narrowed to the requested category (or all three). Default and
 * private rows carry no action; a `public` row is the one place left to
 * unsubscribe, since the directory list only ever shows joinable groups.
 */
export function myGroupRows(catalog: GroupCatalog, filter: GroupCategoryFilter): MyGroupRow[] {
  const rows: MyGroupRow[] = [];
  if (filter === "all" || filter === "default") {
    for (const name of catalog.defaultGroups) rows.push({ name, category: "default" });
  }
  if (filter === "all" || filter === "private") {
    for (const name of catalog.privateGroups) rows.push({ name, category: "private" });
  }
  if (filter === "all" || filter === "public") {
    for (const g of catalog.publicGroups) {
      if (g.isSubscribed) rows.push({ name: g.name, category: "public" });
    }
  }
  return rows;
}

/** Search over "My Groups" rows. */
export function filterMyGroupRows(rows: readonly MyGroupRow[], search: string): MyGroupRow[] {
  return rows.filter((r) => matchesSearch(r.name, search));
}
