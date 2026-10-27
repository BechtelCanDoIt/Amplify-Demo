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

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";

/** A quote currency on the Admin page. */
export interface AdminCurrency {
  readonly isoCode: string;
  readonly isActive: boolean;
  /** Active Salesforce price books with an active product priced in it; null when it couldn't be read. */
  readonly pricebookCount: number | null;
  /** Products priced in its fullest price book: how much a rep can quote in it. */
  readonly largestPricebookProducts?: number | null;
  readonly updatedByEmail: string;
  readonly updatedAt: string;
}

const DOMAIN = "admin-currencies";

/** Every quote currency, USD first (Admin). */
export function useAdminCurrencies(): UseQueryResult<AdminCurrency[], Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<AdminCurrency[], Error>({
    queryKey: key(DOMAIN),
    queryFn: async () => authedGet<AdminCurrency[]>(cado2ServiceUrls.adminCurrencies, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** A change also changes what reps can choose (GET /currencies). */
function useInvalidateCurrencies() {
  const { key } = useCado2Basis();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key(DOMAIN) }),
      queryClient.invalidateQueries({ queryKey: key("currencies") }),
    ]);
}

/** Adds a currency; refused unless Salesforce has prices in it. */
export function useAddCurrency() {
  const { getToken } = useCado2Basis();
  const invalidate = useInvalidateCurrencies();
  return useMutation<AdminCurrency, Error, string>({
    mutationFn: async (isoCode) =>
      cado2Send<AdminCurrency>("POST", cado2ServiceUrls.adminCurrencies, await getToken(), { isoCode }),
    onSuccess: invalidate,
  });
}

/** Switches a currency on or off. */
export function useSetCurrencyActive() {
  const { getToken } = useCado2Basis();
  const invalidate = useInvalidateCurrencies();
  return useMutation<AdminCurrency, Error, { isoCode: string; isActive: boolean }>({
    mutationFn: async ({ isoCode, isActive }) =>
      cado2Send<AdminCurrency>("PATCH", cado2ServiceUrls.adminCurrency(isoCode), await getToken(), { isActive }),
    onSuccess: invalidate,
  });
}
