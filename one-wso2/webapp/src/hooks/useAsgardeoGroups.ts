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

import { useQuery } from "@tanstack/react-query";
import { useAsgardeo } from "@asgardeo/react";
import { useAsgardeoSub } from "@hooks/useAsgardeoSub";

// The signed-in user's Asgardeo group memberships, read from the `groups`
// claim of the id_token. The `groups` scope is already requested at sign-in
// (see authConfig), so the claim is present without an extra round trip.
//
// Why this exists at all, when every other authorization decision in this app
// comes from a backend: some services gate on an Asgardeo group WITHOUT
// exposing a `/me` endpoint that says whether the caller holds it. The
// subscription service is the first — it publishes the NAMES of its two admin
// groups on /subscriptions/meta-info and leaves the comparison to the client,
// which is exactly what its own standalone app did. Marketing Ops, which does
// have `/api/me`, should keep asking the backend instead: a server-computed
// answer can't drift from what the server will actually allow.
//
// This is presentation only, in the strict sense. It decides which controls
// are worth showing; every one of them still hits a backend that re-derives
// the same groups from the JWT and 403s a caller who doesn't hold them. A
// tampered token doesn't grant anything — it grants a screen whose every
// button fails.
//
// Same decode path as useAsgardeoUser / useAsgardeoSub: useAsgardeo().user is
// only populated when `preferences.user.fetchUserProfile` is on (we disable
// it) or on AsgardeoV2 (our tenant isn't), so decoding the id_token is the one
// route that always works.

export interface AsgardeoGroups {
  /** False until the token has been decoded — hold gated UI until it clears. */
  ready: boolean;
  /** Group names, or an empty array when the claim is absent. */
  groups: string[];
  /** Set when the decode itself failed, so callers can offer a retry. */
  error?: string;
  /**
   * Retries whichever half failed — the `sub` resolution itself
   * (`useAsgardeoSub`'s own retry) and the groups query's refetch, both
   * unconditionally: calling the one that didn't fail is a harmless no-op
   * (a cache hit), and the caller has no way to know which half is actually
   * broken from out here.
   */
  retry: () => void;
}

// Asgardeo emits `groups` as an array, but a user in exactly ONE group can
// come back as a bare string from some IS configurations. Normalising both
// shapes here means no caller has to know that, and an unexpected shape
// degrades to "no groups" rather than throwing during a render.
function normalizeGroups(claim: unknown): string[] {
  if (Array.isArray(claim)) return claim.filter((g): g is string => typeof g === "string");
  if (typeof claim === "string" && claim.trim()) return [claim];
  return [];
}

export function useAsgardeoGroups(): AsgardeoGroups {
  const { isSignedIn, getDecodedIdToken } = useAsgardeo();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;

  // Keyed on `sub`, which is what makes a sign-out → different-user sign-in in
  // the same tab safe: the new user's key has no cached entry, so the previous
  // user's groups can never be read back during the window before the fresh
  // decode lands. That is also why this is a query rather than the useState +
  // useEffect pair its two sibling hooks use — there is no correct way to
  // express "forget the old answer" in that shape without a synchronous
  // setState in the effect body.
  //
  // Shared, too: the rail and both pages ask independently and React Query
  // dedupes them into one decode.
  const query = useQuery<string[]>({
    queryKey: ["asgardeo-groups", userSub],
    enabled: isSignedIn && Boolean(userSub),
    queryFn: async () => {
      const token = (await getDecodedIdToken()) as { groups?: unknown } | null;
      return normalizeGroups(token?.groups);
    },
    // The claim is fixed for the life of the token, so this only ever re-runs
    // after a token refresh replaces it.
    staleTime: 5 * 60 * 1000,
    // A decode either works or doesn't; retrying parses the same string again.
    retry: false,
  });

  // Retries whichever half is actually broken. The caller (a gate's own
  // `retry`) has no visibility into which one that is, so both run — the
  // healthy half's call is just a cache hit / a no-op refetch.
  const retry = () => {
    retryIdentity();
    void query.refetch();
  };

  // Checked first: with identity unresolved the query stays disabled forever,
  // so leaving it to `isPending` below would report "still loading" for a
  // failure that is never going to resolve.
  if (subState.status === "error") {
    return { ready: true, groups: [], error: subState.message, retry };
  }

  if (query.isError) {
    // `ready: true` with no groups, plus an error string. Callers fail CLOSED
    // on the groups (an admin control stays hidden) but can still say WHY,
    // rather than silently presenting a reduced screen as if it were the
    // user's real level of access.
    return {
      ready: true,
      groups: [],
      error: "Couldn't read your group memberships from your session.",
      retry,
    };
  }

  // `isPending` covers the disabled window too (before `sub` resolves), which
  // is exactly what callers should treat as "not decided yet".
  if (query.isPending) return { ready: false, groups: [], retry };

  return { ready: true, groups: query.data, retry };
}

/** True when `groups` contains any of `required`. Empty `required` → false. */
export function hasAnyGroup(groups: readonly string[], required: readonly string[]): boolean {
  return required.some((r) => Boolean(r) && groups.includes(r));
}
