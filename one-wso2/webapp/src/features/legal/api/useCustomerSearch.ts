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

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isLegalBackendConfigured, legalServiceUrls } from "@config/apiConfig";

export interface CustomerAddress {
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
}

export interface CustomerResult {
  id: string;
  name: string;
  subRegion: string | null;
  subIndustry: string | null;
  salesRegion: string | null;
  address: CustomerAddress | null;
}

/** Format a billing address into a single line, omitting null parts. */
export function formatCustomerAddress(address: CustomerAddress | null): string {
  if (!address) return "";
  const parts = [
    address.billingStreet,
    address.billingCity,
    [address.billingState, address.billingPostalCode].filter(Boolean).join(" "),
    address.billingCountry,
  ].filter(Boolean);
  return parts.join(", ");
}

// Search WSO2 customers by name fragment via the customer-search backend.
//
// Debounces the raw input by 300 ms before hitting the API so we don't fire
// a request on every keystroke. Returns CustomerResult[] so callers can use
// both the name (for the Autocomplete label) and the address (for the PDF).
// The query is disabled when the backend is not configured or the input is
// shorter than 2 characters.
export function useCustomerSearch(search: string) {
  const getAccessToken = useAccessToken();
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  return useQuery<CustomerResult[]>({
    queryKey: ["legal", "customer-search", debouncedSearch],
    enabled: isLegalBackendConfigured() && debouncedSearch.trim().length >= 2,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      const data = await authedPost<unknown>(legalServiceUrls.customerSearch, accessToken, {
        isRealTime: true,
        customerNameLike: debouncedSearch,
      });
      if (data === null) return [];
      if (!Array.isArray(data)) throw new Error("Customer search returned an unexpected response");
      return (data as CustomerResult[]).filter((c) => Boolean(c.name));
    },
    placeholderData: (prev) => prev,
  });
}
