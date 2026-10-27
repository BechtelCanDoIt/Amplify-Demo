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

// Registry for the Due Diligence app (digiops-finance/apps/due_diligence),
// surfaced under BOTH the Finance and Legal perspectives — see
// DUE_DILIGENCE_APPS included from perspectives.ts's `finance` and `legal`
// PerspectiveDefs. One registry, included twice, so the rail can't drift
// between the two entry points. Same model as FINANCE_APPS/MARKETING_OPS_APPS
// — one MenuApp per app, its sub-screens as items.
//
// Its routes live OUTSIDE both perspectives, at a top-level /due-diligence/*
// prefix (see App.tsx) — the same reason /settings does: a feature reachable
// from two different rails can't itself live under either rail's own path
// prefix, or landing on it directly would only ever resolve one of the two.
//
// ---- on `requires` --------------------------------------------------------
//
// Same two-layer gating as Marketing Ops: `requires` here speaks One WSO2's
// own coarse capability vocabulary (employee/lead/serviceDesk/admin), which
// has nothing to do with the due-diligence backend's own role names. The REAL
// decision is made by useDueDiligenceGate against this backend's own
// /user-info roles. Whatever renders these sections must ask that gate, not
// just read `requires` — see SideRail's DUE_DILIGENCE_ITEM_IDS dispatch.

import { ClipboardCheckIcon } from "@wso2/oxygen-ui-icons-react";
import type { MenuApp } from "@constants/appMenu";

export const DUE_DILIGENCE_APPS: readonly MenuApp[] = [
  {
    key: "due-diligence",
    name: "Due Diligence",
    // Deliberately not ScaleIcon — that's the Legal perspective's own icon
    // (its "Overview" row), and reusing it here made the rail show the same
    // icon twice in a row for Legal users.
    icon: ClipboardCheckIcon,
    purpose:
      "Reseller and trade-reference due-diligence review — partner vetting, credit scoring, and finance/legal approval.",
    items: [
      {
        id: "dd-partners",
        label: "Partners",
        desc: "Reseller partner applications — review, approve, and track finance/legal sign-off.",
        requires: ["admin"],
        path: "/due-diligence/partners",
      },
      {
        id: "dd-trade-references",
        label: "Trade References",
        desc: "Trade reference requests and their review status.",
        requires: ["admin"],
        path: "/due-diligence/trade-references",
      },
      // Gate: due-diligence role "adminRole" only, not the broader
      // "any role" bar the other two items use — see useDueDiligenceGate.canSee.
      {
        id: "dd-preferences",
        label: "Preferences",
        desc: "Ratio scoring scales and notification email recipients.",
        requires: ["admin"],
        path: "/due-diligence/preferences",
      },
    ],
  },
];

export const DUE_DILIGENCE_ITEM_IDS: ReadonlySet<string> = new Set(
  DUE_DILIGENCE_APPS.flatMap((app) => app.items.map((it) => it.id)),
);

// Eyebrow descriptor for DueDiligenceShell, derived from the registry above so
// the chip on every Due Diligence screen can't drift from the app's own name
// and icon. Same helper and reason as FINANCE_EYEBROW / MARKETING_OPS_EYEBROW.
export const DUE_DILIGENCE_EYEBROW = {
  icon: DUE_DILIGENCE_APPS[0].icon,
  label: DUE_DILIGENCE_APPS[0].name,
} as const;
