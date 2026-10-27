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

// Turns the feed's controls into a GET /submissions query.

import type { TilSubmissionsQuery, TilWhere } from "../api/tilTypes";

export interface TilFeedFilters {
  search: string;
  /** Local calendar days as a date input gives them ("2026-10-31"); "" when unset. */
  dateFrom: string;
  dateTo: string;
  /** The author's name, as typed; "" when unset. */
  author?: string;
  /** "" for every source. */
  source?: TilWhere | "";
  mine: boolean;
}

/** The start of local calendar day `day`, plus `addDays`, as an ISO 8601
 * time. Local, not UTC, so "from the 1st" means the reader's own 1st wherever
 * they are, daylight saving included. */
export function startOfLocalDay(day: string, addDays = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d + addDays).toISOString();
}

export function tilFeedQuery(filters: TilFeedFilters, page: number, pageSize: number): TilSubmissionsQuery {
  const search = filters.search.trim();
  const author = filters.author?.trim();
  return {
    ...(search ? { search } : {}),
    ...(author ? { author } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.dateFrom ? { createdFrom: startOfLocalDay(filters.dateFrom) } : {}),
    // The start of the day after: createdBefore is exclusive, so the whole of
    // the last day counts.
    ...(filters.dateTo ? { createdBefore: startOfLocalDay(filters.dateTo, 1) } : {}),
    ...(filters.mine ? { mine: true } : {}),
    limit: pageSize,
    offset: (Math.max(1, page) - 1) * pageSize,
  };
}
