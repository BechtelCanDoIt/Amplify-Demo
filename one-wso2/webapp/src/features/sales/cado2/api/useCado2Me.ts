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

// The caller as CadO2's backend sees them. Decides the rail and every CadO2
// route; hiding an entry is a convenience, since every endpoint re-checks.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { cado2ServiceUrls } from "@config/apiConfig";
import { foldIdentityError } from "@hooks/useAsgardeoSub";
import { useCado2Basis } from "./cado2Basis";

/** CadO2 roles, as returned by the backend. */
export type Cado2Role = "SALES" | "ADMIN";

/** GET /me. */
export interface Cado2Me {
  readonly sub: string;
  readonly email: string;
  readonly roles: readonly Cado2Role[];
  /** Approval roles such as "DEAL_DESK"; an approver needs no CadO2 role. */
  readonly approverRoles: readonly string[];
}

/**
 * `enabled` lets the rail ask only while Sales is the open perspective. Same
 * key, so the rail and the pages share one request.
 */
export function useCado2Me(enabled = true): UseQueryResult<Cado2Me, Error> {
  const { getToken, ready, key, subState, retryIdentity } = useCado2Basis();
  const query = useQuery<Cado2Me, Error>({
    queryKey: key("me"),
    queryFn: async () => authedGet<Cado2Me>(cado2ServiceUrls.me, await getToken()),
    enabled: ready && enabled,
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });
  return foldIdentityError(query, subState, retryIdentity);
}

/** What a person may open in CadO2. */
export interface Cado2Access {
  canQuote: boolean;
  canApprove: boolean;
  isAdmin: boolean;
}

export function cado2Access(me: Cado2Me | undefined): Cado2Access {
  const roles = me?.roles ?? [];
  const isAdmin = roles.includes("ADMIN");
  return {
    // Roles add up; ADMIN is the admin panel only and gives no quote access.
    canQuote: roles.includes("SALES"),
    canApprove: (me?.approverRoles.length ?? 0) > 0,
    isAdmin,
  };
}
