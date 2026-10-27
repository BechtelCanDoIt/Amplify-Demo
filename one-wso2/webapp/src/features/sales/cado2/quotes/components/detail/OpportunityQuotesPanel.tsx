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

import type { JSX } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Link, Stack, Typography } from "@wso2/oxygen-ui";
import { LayersIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useOpportunityQuotes } from "@features/sales/cado2/quotes/api/useQuoteApi";
import StatusChip from "@features/sales/cado2/components/status-chip/StatusChip";
import PrimaryStar from "@features/sales/cado2/components/primary-star/PrimaryStar";
import {
  STATUS_COLOR,
  quoteStatusLabel,
} from "@features/sales/cado2/quotes/lifecycle/lifecycle";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";

/**
 * The quote page's list of every quote on the same opportunity (D68), the
 * primary one starred. Every AM sees them all (D69).
 */
export default function OpportunityQuotesPanel({
  quoteId,
  opportunityId,
}: {
  quoteId: number;
  opportunityId: string;
}): JSX.Element | null {
  const quotes = useOpportunityQuotes(opportunityId);
  // A failed load says so, rather than the card vanishing (2026-10-13).
  if (quotes.error) {
    return (
      <ErrorNotice error={quotes.error} onRetry={() => void quotes.refetch()} retrying={quotes.isFetching}>
        Couldn&apos;t load this opportunity&apos;s quotes.
      </ErrorNotice>
    );
  }
  if (!quotes.data) return null;
  const hasPrimary = quotes.data.some((q) => q.isPrimary);

  return (
    <SectionCard title="This Opportunity's Quotes" icon={<LayersIcon size={18} />}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mb: 1.5 }}
      >
        {hasPrimary
          ? "The primary quote is synced to Salesforce."
          : "No primary quote: nothing is synced to Salesforce."}
      </Typography>
      {/* Fixed columns (2026-10-14): star, quote and owner, status on the right;
          the current quote is a shaded row, "This quote" under its number. */}
      <Stack component="ul" spacing={0.5} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {quotes.data.map((q) => {
          const current = q.quoteId === quoteId;
          return (
            <Box
              component="li"
              key={q.quoteId}
              aria-current={current ? "true" : undefined}
              sx={{
                display: "grid",
                gridTemplateColumns: "16px minmax(0,1fr) auto",
                columnGap: 1,
                alignItems: "center",
                px: 1,
                py: 0.75,
                mx: -1,
                borderRadius: 1,
                bgcolor: current ? "action.selected" : "transparent",
              }}
            >
              <Box sx={{ display: "inline-flex" }}>{q.isPrimary ? <PrimaryStar /> : null}</Box>
              <Box sx={{ minWidth: 0 }}>
                {current ? (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {q.quoteNumber ?? "Draft"}
                  </Typography>
                ) : (
                  <Link component={RouterLink} to={cado2Paths.quote(q.quoteId)} variant="body2" sx={{ fontWeight: 600 }}>
                    {q.quoteNumber ?? "Draft"}
                  </Link>
                )}
                <Typography variant="caption" color="text.secondary" display="block" noWrap title={q.ownerEmail}>
                  {current ? `This quote · ${q.ownerEmail}` : q.ownerEmail}
                </Typography>
              </Box>
              <StatusChip color={STATUS_COLOR[q.status]} label={quoteStatusLabel(q.status, q.versionNumber)} />
            </Box>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
