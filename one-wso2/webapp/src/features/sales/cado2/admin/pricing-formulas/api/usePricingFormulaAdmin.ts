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

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { useCado2Basis } from "@features/sales/cado2/api/cado2Basis";
import { cado2Send } from "@features/sales/cado2/api/cado2Http";
import type { PricingFormula } from "@features/sales/cado2/quotes/api/quoteTypes";
import type {
  FormulaBindingInput,
  FormulaProductOption,
  PricingFormulaTryInput,
  PricingFormulaTryResult,
} from "./pricingFormulaTypes";

/** The query key every formula read sits under (the quote screens' list too). */
export const FORMULA_DOMAIN = "pricing-formulas";

/** A formula saved or removed: the formulas and their history. */
function useInvalidateFormulas() {
  const { key } = useCado2Basis();
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: key(FORMULA_DOMAIN) });
}

/** Saves a product's formula as its next version (D82); existing quotes keep theirs. */
export function useSavePricingFormula() {
  const { getToken } = useCado2Basis();
  const onSaved = useInvalidateFormulas();
  return useMutation<
    PricingFormula,
    Error,
    { productId: string; expression: string; unitOfMeasure: string; bindings: readonly FormulaBindingInput[] }
  >({
    mutationFn: async ({ productId, ...body }) =>
      cado2Send<PricingFormula>("PUT", cado2ServiceUrls.adminPricingFormula(productId), await getToken(), body),
    onSuccess: onSaved,
  });
}

/** Removes a product's formula: a REMOVED version, so new lines take the price-book price. */
export function useDeletePricingFormula() {
  const { getToken } = useCado2Basis();
  const onSaved = useInvalidateFormulas();
  return useMutation<PricingFormula, Error, { productId: string }>({
    mutationFn: async ({ productId }) =>
      cado2Send<PricingFormula>("DELETE", cado2ServiceUrls.adminPricingFormula(productId), await getToken(), undefined),
    onSuccess: onSaved,
  });
}

/** Works a formula out with sample values; nothing is saved. */
export function useTryPricingFormula() {
  const { getToken } = useCado2Basis();
  return useMutation<PricingFormulaTryResult, Error, PricingFormulaTryInput>({
    mutationFn: async (body) =>
      cado2Send<PricingFormulaTryResult>("POST", cado2ServiceUrls.pricingFormulaTry, await getToken(), body),
  });
}

/** A page of the formula editor's product list. */
export const FORMULA_PRODUCT_PAGE = 50;
/** The backend's last offset: each page reads every currency from the start. */
const LAST_FORMULA_PRODUCT_OFFSET = 950;

/**
 * Every active product in any quote currency, a page at a time, as the Add
 * line dialog lists a price book's; `term` matches the name or product code.
 * Loaded once the list is opened.
 */
export function useFormulaProducts(term: string, enabled: boolean) {
  const t = term.trim();
  const { getToken, ready, key } = useCado2Basis();
  return useInfiniteQuery<FormulaProductOption[], Error, FormulaProductOption[], readonly unknown[], number>({
    queryKey: key(FORMULA_DOMAIN, "products", t),
    queryFn: async ({ pageParam }) =>
      authedGet<FormulaProductOption[]>(
        cado2ServiceUrls.pricingFormulaProducts(t, FORMULA_PRODUCT_PAGE, pageParam),
        await getToken(),
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const next = pages.length * FORMULA_PRODUCT_PAGE;
      return last.length < FORMULA_PRODUCT_PAGE || next > LAST_FORMULA_PRODUCT_OFFSET ? undefined : next;
    },
    select: (data) => data.pages.flat(),
    enabled: ready && enabled,
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
}

/** Every version of one product's formula, newest first (its history page). */
export function usePricingFormulaVersions(productId: string) {
  const { getToken, ready, key } = useCado2Basis();
  return useQuery<PricingFormula[], Error>({
    queryKey: key(FORMULA_DOMAIN, "versions", productId),
    queryFn: async () => authedGet<PricingFormula[]>(cado2ServiceUrls.pricingFormulaVersions(productId), await getToken()),
    enabled: ready && productId !== "",
    staleTime: 0,
    refetchOnMount: "always",
    retry: httpRetry,
  });
}
