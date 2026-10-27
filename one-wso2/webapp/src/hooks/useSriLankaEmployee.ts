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

import { useUserInfo } from "@api/useUserInfo";
import { peopleBackendUrl } from "@config/apiConfig";
import { isSriLankaWorkLocation } from "@utils/locationGate";

export interface SriLankaEmployee {
  /** True once /user-info says so. False while unresolved — fails closed. */
  isSriLanka: boolean;
  /**
   * True while the answer is still coming.
   *
   * Callers that merely SHOW something can ignore this and let `isSriLanka`
   * fail closed: the row appears a moment later rather than flashing and being
   * withdrawn. Callers that NAVIGATE or REFUSE on the answer must wait for it —
   * a redirect fired on the unresolved `false` cannot be taken back, because
   * the component that would correct it has already unmounted.
   */
  isResolving: boolean;
}

/**
 * Whether this employee works in Sri Lanka, and whether we know yet.
 *
 * Cafeteria, the two subscription screens and OPD claims are all a Colombo-office
 * perk — see isSriLankaWorkLocation. They ask the SAME /user-info the rail and
 * the profile already fetch, so this adds no request.
 */
export function useSriLankaEmployee(): SriLankaEmployee {
  const userInfo = useUserInfo();
  return {
    isSriLanka: isSriLankaWorkLocation(userInfo.data?.workLocation),
    // `isPending`, not `isLoading`: the window before the Asgardeo sub resolves
    // leaves the query enabled but not yet fetching, and `isLoading` reads false
    // there — which is exactly the cold load this exists to cover. Guarded on
    // the backend being configured for the mirror-image reason: an unconfigured
    // deployment keeps the query permanently disabled and therefore permanently
    // `isPending`, so without this a caller that waits would wait forever. Same
    // pairing, and the same reasoning, as useDueDiligenceGate.
    isResolving: Boolean(peopleBackendUrl) && userInfo.isPending,
  };
}
