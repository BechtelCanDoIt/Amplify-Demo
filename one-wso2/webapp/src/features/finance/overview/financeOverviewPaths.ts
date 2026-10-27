/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Where FinanceOverviewPage lives under the Finance perspective.
 *
 * Named here rather than written out in the registry and the router
 * separately: those two disagreeing is a 404 nobody notices until someone
 * clicks the rail entry — the same reasoning `ccPaths.ts` and the OPD
 * app's own path module (now retired, this replaces its one entry) use.
 *
 * Two forms because `<Route path>` wants a segment relative to its parent
 * route while the registry and any `navigate()` call want the absolute path
 * — `FINANCE_OVERVIEW_ROUTE` is `FINANCE_OVERVIEW_PATH` with the leading
 * slash it structurally can't have, not two numbers someone has to
 * remember to keep in sync by hand.
 */
export const FINANCE_OVERVIEW_ROUTE = "finance/overview";
export const FINANCE_OVERVIEW_PATH = `/${FINANCE_OVERVIEW_ROUTE}`;
