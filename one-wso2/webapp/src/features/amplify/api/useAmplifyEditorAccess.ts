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

import { hasAnyGroup, useAsgardeoGroups } from "@hooks/useAsgardeoGroups";
import { AMPLIFY_DASHBOARD_ITEM_IDS, AMPLIFY_EDITOR_ITEM_IDS } from "@constants/perspectives";
import type { VisibilityAnswer } from "@components/side-rail/visibilityFold";

/**
 * The Asgardeo groups that may register and edit Amplify posts. The same two
 * amplify-api's activity matrix lets through on POST/PATCH/DELETE /campaigns
 * (CAMPAIGN_EDITORS in modules/auth/matrix.bal).
 */
export const AMPLIFY_EDITOR_GROUPS = ["amplify_po", "amplify_marketing"] as const;

export interface AmplifyEditorAccess {
  hasAccess: boolean;
  isResolving: boolean;
  error?: string;
  retry: () => void;
}

/**
 * Whether the caller holds `amplify_po` or `amplify_marketing`, from the
 * `groups` claim of the id_token. Same shape as the Hello → Sarah gate.
 *
 * Presentation only. It decides whether New Post and Current Posts are offered;
 * amplify-api re-derives the roles from the JWT and 403s anyone else on every
 * write. `enabled` keeps it quiet off the Amplify perspective, and while it
 * isn't enabled it answers "no access" rather than "resolving", so it never
 * holds a landing it has nothing to say about.
 */
export function useAmplifyEditorAccess(enabled = true): AmplifyEditorAccess {
  const groups = useAsgardeoGroups();
  if (!enabled) return { hasAccess: false, isResolving: false, retry: groups.retry };
  return {
    hasAccess: groups.ready && hasAnyGroup(groups.groups, AMPLIFY_EDITOR_GROUPS),
    isResolving: !groups.ready,
    error: groups.error,
    retry: groups.retry,
  };
}

/**
 * The left-menu answer for Amplify's PO/Marketing rows. Hidden while
 * resolving (fails closed) and on a failed decode; the route guard is where a
 * failed decode is explained.
 */
export function amplifyEditorVisibility(gate: AmplifyEditorAccess): VisibilityAnswer {
  return {
    canSee: (id) => AMPLIFY_EDITOR_ITEM_IDS.has(id) && gate.hasAccess && !gate.isResolving,
    resolving: gate.isResolving,
    retry: gate.retry,
  };
}

/**
 * The Asgardeo groups that may open the Dashboarding boards: every known
 * amplify_* role. The same four amplify-api's activity matrix lets through on
 * GET /dashboards/* (PO, MKT, SLT, ADM); a plain employee has none of them.
 */
export const AMPLIFY_DASHBOARD_GROUPS = [
  "amplify_po",
  "amplify_marketing",
  "amplify_slt",
  "amplify_admin",
] as const;

export type AmplifyDashboardAccess = AmplifyEditorAccess;

/**
 * Whether the caller holds any amplify_* role, from the `groups` claim of the
 * id_token. Presentation only: amplify-api 403s everyone else on every board.
 * Fails closed (no access) while the token is still being decoded or `enabled`
 * is false.
 */
export function useAmplifyDashboardAccess(enabled = true): AmplifyDashboardAccess {
  const groups = useAsgardeoGroups();
  if (!enabled) return { hasAccess: false, isResolving: false, retry: groups.retry };
  return {
    hasAccess: groups.ready && hasAnyGroup(groups.groups, AMPLIFY_DASHBOARD_GROUPS),
    isResolving: !groups.ready,
    error: groups.error,
    retry: groups.retry,
  };
}

/**
 * The left-menu answer for Amplify's role-gated rows: New Post and Current
 * Posts for editors, the Dashboarding boards for any amplify_* role.
 */
export function amplifyVisibility(editor: AmplifyEditorAccess, dashboards: AmplifyDashboardAccess): VisibilityAnswer {
  const resolving = editor.isResolving || dashboards.isResolving;
  return {
    canSee: (id) =>
      (AMPLIFY_EDITOR_ITEM_IDS.has(id) && editor.hasAccess && !editor.isResolving) ||
      (AMPLIFY_DASHBOARD_ITEM_IDS.has(id) && dashboards.hasAccess && !dashboards.isResolving),
    resolving,
    retry: editor.retry,
  };
}
