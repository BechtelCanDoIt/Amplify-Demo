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

import type { PromotionHistoryEntry } from "../api/types";

// Approved promotion requests, newest first. Job band only ever moves up,
// so `nextJobBand` — not a timestamp — is what orders a promotion history:
// the highest band an employee reached is by definition their latest
// promotion. `updatedOn` would be the obvious sort key but it tracks the
// last edit to the row, so an admin correcting a 2021 record would drag it
// to the top of the list.
//
// `id` breaks ties descending, keeping the order stable if two approved
// rows ever share a band.
export function sortPromotionsByBand(
  list: PromotionHistoryEntry[],
): PromotionHistoryEntry[] {
  return [...list].sort((a, b) => {
    if (b.nextJobBand !== a.nextJobBand) return b.nextJobBand - a.nextJobBand;
    return b.id - a.id;
  });
}

// The single most recent promotion, or null when nothing is approved yet.
export function latestPromotion(
  list: PromotionHistoryEntry[] | undefined,
): PromotionHistoryEntry | null {
  if (!list || list.length === 0) return null;
  return sortPromotionsByBand(list)[0];
}

// One-line summary for the profile card: cycle plus the band jump, e.g.
// "2023-H2 · JB 5 → 6". Named by cycle rather than promotedDate, which older
// records don't have, so every record reads the same way.
export function promotionSummary(entry: PromotionHistoryEntry): string {
  return `${entry.promotionCycle} · JB ${entry.currentJobBand} → ${entry.nextJobBand}`;
}

// yyyy-mm-dd out of whatever date-ish string the backend sends — both
// employee-info's startDate and a request's createdOn/updatedOn are already
// plain dates or ISO datetimes; this just trims a trailing time component
// rather than reformatting, so an unparseable value still renders as-is
// instead of blanking out.
export function formatDate(v: string | null | undefined): string {
  if (!v) return "—";
  return v.length > 10 ? v.slice(0, 10) : v;
}
