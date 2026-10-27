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

// Registry of CadO2, the quote tool, surfaced as a group inside the Sales
// perspective. Its own file and its own id set for the same reason as
// misApps.ts: these rows are decided by CadO2's own `/me` (useCado2RailGate),
// not by the meet-app gate that owns SALES_ITEM_IDS, and not by people-app
// capabilities.
//
// `requires: ["admin"]` on every item means RESTRICTED, nothing more: the
// visibility fold hands these ids to the `cado2` adapter, which decides
// against CadO2's roles. An id missing from CADO2_ITEM_IDS would fall through
// to the capability check and show to people-app admins instead.

import { ClipboardCheckIcon, FileTextIcon, ReceiptTextIcon, SettingsIcon } from "@wso2/oxygen-ui-icons-react";
import type { MenuApp } from "@constants/appMenu";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";

/** The group's id, as appsToSections names it. */
export const CADO2_GROUP_ID = "sec-app-cado2";

export const CADO2_ITEM = {
  quotes: "sales-cado2-quotes",
  approvals: "sales-cado2-approvals",
  admin: "sales-cado2-admin",
} as const;

export const CADO2_APPS: readonly MenuApp[] = [
  {
    key: "cado2",
    name: "CADO2",
    // A line icon, as MenuApp needs; the Sales rail shows CADO2's own logo
    // instead (Cado2LogoIcon, set in perspectives.ts like Echo's).
    icon: ReceiptTextIcon,
    purpose: "Build quotes from Salesforce opportunities and take them through approval.",
    // A rep who is not an approver sees one row; it still belongs under CadO2.
    alwaysGroup: true,
    items: [
      {
        id: CADO2_ITEM.quotes,
        label: "Quotes",
        icon: FileTextIcon,
        desc: "Your quotes and everyone else's: drafts, submitted, approved and closed.",
        requires: ["admin"],
        path: cado2Paths.quotes,
      },
      {
        id: CADO2_ITEM.approvals,
        label: "My Approvals",
        icon: ClipboardCheckIcon,
        desc: "Approval steps waiting on your roles.",
        requires: ["admin"],
        path: cado2Paths.approvals,
      },
      {
        id: CADO2_ITEM.admin,
        label: "Admin",
        icon: SettingsIcon,
        desc: "The approval matrix, approval SLAs and CADO2's reference data.",
        requires: ["admin"],
        path: cado2Paths.admin,
      },
    ],
  },
];

/** Every CadO2 rail id, the group included, for the `cado2` adapter. */
export const CADO2_ITEM_IDS: ReadonlySet<string> = new Set([
  CADO2_GROUP_ID,
  ...CADO2_APPS.flatMap((app) => app.items.map((it) => it.id)),
]);
