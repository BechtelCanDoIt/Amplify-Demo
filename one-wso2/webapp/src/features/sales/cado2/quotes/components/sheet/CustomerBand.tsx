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

import type { JSX, ReactNode } from "react";
import { Avatar, Box, Paper, Stack, Typography } from "@wso2/oxygen-ui";
import { BriefcaseIcon } from "@wso2/oxygen-ui-icons-react";
import type { QuoteSheet } from "@features/sales/cado2/quotes/sheet/sheetModel";
import { initialsOfName as initialsFor } from "@features/sales/cado2/utils/initials";
import SalesforceLink from "@features/sales/cado2/components/salesforce-link/SalesforceLink";

/**
 * The quote page's record header: the band, with the quote number above the
 * account, the status, and the page's actions (2026-10-07; frontend.md, "Page
 * titles": a record page's header carries the record's identity).
 */
interface HeaderParts {
  /** Above the account name, e.g. "Q-26-00012 · Version 2". */
  readonly eyebrow: ReactNode;
  /** Status chips, under the account name: what the quote is, apart from what can be done. */
  readonly status: ReactNode;
  /** The page's main button and its "⋯" menu, top right. */
  readonly actions: ReactNode;
}

/**
 * Who the quote is for: account and opportunity, up front (the deal type,
 * partner, region and currency are facts in the Deal section). The
 * contacts sit with the addresses. With `header`, it is the quote page's
 * header (the account is the page's title); without, a box at the top of the
 * Review step.
 */
export default function CustomerBand({ sheet, header }: { sheet: QuoteSheet; header?: HeaderParts }): JSX.Element {
  return (
    <Paper
      component={header ? "header" : "section"}
      aria-label={header ? "About this quote" : "Customer"}
      variant="outlined"
      // Compact (D99): less padding, a smaller avatar; the partner is in the Deal section.
      sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 1.75 }, borderRadius: 2, borderLeft: 4, borderLeftColor: "primary.main", minWidth: 0 }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ width: 44, height: 44, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 18, fontWeight: 600 }}>
            {initialsFor(sheet.accountName || "?")}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            {header ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                {header.eyebrow}
              </Typography>
            ) : null}
            <Typography
              variant={header ? "h4" : "h5"}
              component={header ? "h1" : "p"}
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              <SalesforceLink object="Account" id={sheet.accountId}>
                {sheet.accountName || "No account yet"}
              </SalesforceLink>
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25, color: "text.secondary", minWidth: 0 }}>
              <BriefcaseIcon size={14} />
              <Typography variant="body2">
                <SalesforceLink object="Opportunity" id={sheet.opportunityId}>
                  {sheet.opportunityName || "No opportunity yet"}
                </SalesforceLink>
              </Typography>
            </Stack>
            {header ? <Box sx={{ mt: 0.75 }}>{header.status}</Box> : null}
          </Box>
        </Stack>
        <Stack spacing={2} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ minWidth: 0, flexShrink: 0 }}>
        {header ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1, justifyContent: { md: "flex-end" } }}>
            {header.actions}
          </Stack>
        ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
