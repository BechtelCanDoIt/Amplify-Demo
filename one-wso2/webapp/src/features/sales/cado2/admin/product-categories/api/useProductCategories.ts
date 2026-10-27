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
import { authedDelete, authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";
import type { LineCategory } from "@features/sales/cado2/quotes/api/quoteTypes";
import type { ProductCategoryMapping, ProductCategorySearchItem } from "./productCategoryTypes";

/** The shortest search the backend accepts. */
export const MIN_PRODUCT_SEARCH = 2;

const DOMAIN = "product-categories";

/** Every mapped product (Admin). */
export function useProductCategories(): UseQueryResult<ProductCategoryMapping[], Error> {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<ProductCategoryMapping[], Error>({
    queryKey: key(DOMAIN, "mapped"),
    queryFn: async () => authedGet<ProductCategoryMapping[]>(cado2ServiceUrls.productCategories, await getToken()),
    enabled: ready,
    retry: httpRetry,
  });
}

/** Salesforce products by name, with their mapping; idle below MIN_PRODUCT_SEARCH characters. */
export function useProductCategorySearch(term: string): UseQueryResult<ProductCategorySearchItem[], Error> {
  const { getToken, ready, key } = useCado2Basis();
  const q = term.trim();
  return useQuery<ProductCategorySearchItem[], Error>({
    queryKey: key(DOMAIN, "search", q),
    queryFn: async () =>
      authedGet<ProductCategorySearchItem[]>(cado2ServiceUrls.productCategorySearch(q), await getToken()),
    enabled: ready && q.length >= MIN_PRODUCT_SEARCH,
    retry: httpRetry,
  });
}

/** Maps a product, or unmaps it with a null category. */
export function useSetProductCategory() {
  const { getToken, key } = useCado2Basis();
  const queryClient = useQueryClient();
  return useMutation<void, Error, { productId: string; category: LineCategory | null }>({
    mutationFn: async ({ productId, category }) => {
      const token = await getToken();
      if (category === null) await authedDelete(cado2ServiceUrls.productCategory(productId), token);
      else await cado2Send("PUT", cado2ServiceUrls.productCategory(productId), token, { category });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(DOMAIN) }),
  });
}
