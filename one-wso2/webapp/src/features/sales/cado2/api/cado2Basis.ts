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

// What every CadO2 query needs, gathered once: the access token, whether the
// caller can be asked about yet, and cache keys scoped to the signed-in subject
// so switching accounts in one tab never serves the previous user's quotes.

import { useCallback } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { isCado2BackendConfigured } from "@config/apiConfig";
import { isPreviewEnabled } from "@config/previewFeatures";
import { useAccessToken } from "@hooks/useAccessToken";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";

/** A CadO2 cache key: always `["cado2", <subject>, …parts]`. */
export type Cado2Key = readonly unknown[];

export function useCado2Basis() {
  const { isSignedIn } = useAsgardeo();
  const getToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const sub = subState.status === "ready" ? subState.sub : undefined;
  // The preview flag as well as the URL: with the flag off nothing of CadO2
  // exists, and nothing may call its backend.
  const ready = isSignedIn && isPreviewEnabled("cado2") && isCado2BackendConfigured() && Boolean(sub);
  const key = useCallback((...parts: readonly unknown[]): Cado2Key => ["cado2", sub, ...parts], [sub]);
  return { getToken, sub, subState, retryIdentity, ready, key };
}
