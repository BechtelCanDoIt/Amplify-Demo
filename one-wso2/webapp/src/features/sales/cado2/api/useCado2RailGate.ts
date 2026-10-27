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

// The rail's view of CadO2, beside useSalesRailGate and friends. Nothing here
// is access control: CadO2's backend re-checks every call.

import type { VisibilityAnswer } from "@components/side-rail/visibilityFold";
import { describeError } from "@api/errors";
import { isCado2BackendConfigured } from "@config/apiConfig";
import { CADO2_GROUP_ID, CADO2_ITEM } from "@constants/cado2Apps";
import { cado2Access, useCado2Me, type Cado2Access } from "./useCado2Me";

export interface Cado2RailGate {
  canSee: (itemId: string) => boolean;
  isResolving: boolean;
  /** True when the access check itself failed; reported as "couldn't check", never as "no access". */
  isError: boolean;
  errorMessage: string | undefined;
  retry: () => void;
}

/** Which rows an access answer opens. The group shows when any of its rows does. */
export function cado2CanSee(itemId: string, access: Cado2Access): boolean {
  switch (itemId) {
    case CADO2_ITEM.quotes:
      return access.canQuote;
    case CADO2_ITEM.approvals:
      return access.canApprove;
    case CADO2_ITEM.admin:
      return access.isAdmin;
    case CADO2_GROUP_ID:
      return access.canQuote || access.canApprove || access.isAdmin;
    default:
      // Fail closed: a CadO2 id with no case here is hidden from everyone.
      return false;
  }
}

/**
 * Hidden while `/me` is in flight (so rows never flash in for someone without
 * access) and when the check failed (failing closed, as the other gates do, and
 * reported through isError). With no backend URL configured every row stays:
 * there is nothing to ask, and each page explains what is missing.
 *
 * @param enabled - Whether Sales is the open perspective and CadO2 is switched on
 */
export function useCado2RailGate(enabled: boolean): Cado2RailGate {
  const me = useCado2Me(enabled);
  const configured = isCado2BackendConfigured();
  const active = enabled && configured;
  const isResolving = active && (me.isPending || me.isLoading);
  const failed = active && me.isError;
  const access = cado2Access(me.data);
  return {
    canSee: (itemId) => {
      if (!configured) return true;
      if (!active || isResolving || failed) return false;
      return cado2CanSee(itemId, access);
    },
    isResolving,
    isError: failed,
    errorMessage: failed ? describeError(me.error) : undefined,
    retry: () => void me.refetch(),
  };
}

export function cado2Visibility(gate: Cado2RailGate): VisibilityAnswer {
  const canSee = (id: string) => gate.canSee(id);
  return gate.isError
    ? { canSee, resolving: gate.isResolving, error: gate.errorMessage, retry: gate.retry }
    : { canSee, resolving: gate.isResolving, retry: () => undefined };
}
