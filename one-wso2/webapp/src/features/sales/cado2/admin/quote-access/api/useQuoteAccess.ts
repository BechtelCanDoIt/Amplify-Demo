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

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";
import type { QuoteAccess } from "@features/sales/cado2/quotes/api/quoteTypes";

/** The quote access setting (D69) and who last changed it. */
export interface QuoteAccessSetting {
  readonly access: QuoteAccess;
  readonly updatedByEmail: string | null;
  readonly updatedAt: string | null;
}

const DOMAIN = "admin-quote-access";

export function useQuoteAccess(): UseQueryResult<QuoteAccessSetting, Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<QuoteAccessSetting, Error>({
    queryKey: key(DOMAIN),
    queryFn: async () =>
      authedGet<QuoteAccessSetting>(
        cado2ServiceUrls.adminQuoteAccess,
        await getToken(),
      ),
    enabled: ready,
    retry: httpRetry,
  });
}

/** Changes what AMs may do with quotes they don't own. */
export function useSaveQuoteAccess() {
  const { getToken, key } = useCado2Basis();
  const queryClient = useQueryClient();
  return useMutation<QuoteAccessSetting, Error, QuoteAccess>({
    mutationFn: async (access) =>
      cado2Send<QuoteAccessSetting>(
        "PUT",
        cado2ServiceUrls.adminQuoteAccess,
        await getToken(),
        { access },
      ),
    onSuccess: (saved) => queryClient.setQueryData(key(DOMAIN), saved),
  });
}
