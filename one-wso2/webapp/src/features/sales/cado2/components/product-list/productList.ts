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

// The product dropdown's shared parts (2026-10-15), so the Add line dialog
// and the Admin's formula editor list products the same way: a page at a
// time as the list scrolls, a status line under the options, and each
// product as "Name (CODE)" with its description on a quiet line. The
// components are in ProductListParts.tsx.

import { createContext, useEffect, useRef, type UIEvent } from "react";

/** A product as the list shows it; the code is shown because names repeat. */
export const productLabel = (name: string, code: string | null | undefined): string => (code ? `${name} (${code})` : name);

/** What the product list's popup shows below the options. */
export interface ProductListState {
  /** "Loading more…", "Showing 50 · scroll for more", "All 182 products shown". */
  status: string;
}
export const ProductListContext = createContext<ProductListState | null>(null);

/** The paged query behind a product list (react-query's infinite query). */
interface PagedProducts {
  readonly isPending: boolean;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly fetchNextPage: () => unknown;
}

/**
 * The list's status line, and the listbox props that load the next page on
 * scrolling near the end. MUI scrolls the list back to the top when options
 * are added and none is highlighted, so the position is kept and put back
 * after a page loads.
 */
export function useProductList(products: PagedProducts, count: number) {
  const listbox = useRef<HTMLElement | null>(null);
  const scrolled = useRef(0);
  useEffect(() => {
    if (listbox.current && listbox.current.scrollTop < scrolled.current) listbox.current.scrollTop = scrolled.current;
  }, [count]);
  const state: ProductListState = {
    status: products.isFetchingNextPage
      ? "Loading more…"
      : count === 0 || products.isPending
        ? ""
        : products.hasNextPage
          ? `Showing ${count} · scroll for more`
          : `All ${count} ${count === 1 ? "product" : "products"} shown`,
  };
  const listboxProps = {
    ref: (el: Element | null) => {
      listbox.current = el as HTMLElement | null;
    },
    onScroll: (e: UIEvent<HTMLElement>) => {
      const el = e.currentTarget;
      scrolled.current = el.scrollTop;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && products.hasNextPage && !products.isFetchingNextPage) {
        void products.fetchNextPage();
      }
    },
  };
  return { state, listboxProps };
}
