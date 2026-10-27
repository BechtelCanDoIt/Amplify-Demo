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
import { Alert, Box, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { ShieldCheckIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import type { ApprovalPreview } from "@features/sales/cado2/approvals/api/approvalTypes";
import LazyApprovalDiagram from "./LazyApprovalDiagram";

interface ApprovalPreviewPanelProps {
  readonly preview: ApprovalPreview | undefined;
  readonly loading: boolean;
  readonly error: Error | null;
  /** Draws no heading (the caller has its own, e.g. a dialog title). */
  readonly bare?: boolean;
  /** False when the caller lists the blockers itself (the wizard's Review, C1 2026-10-14). */
  readonly showBlockers?: boolean;
}

/**
 * The approval preview: who would approve if the quote were submitted
 * now, in which order, and why. Information only — nothing is requested until
 * submission. Blockers are the approvals that can't be worked out safely.
 */
export default function ApprovalPreviewPanel({ preview, loading, error, bare = false, showBlockers = true }: ApprovalPreviewPanelProps): JSX.Element {
  const body = (() => {
    if (error && !preview) {
      return (
        // The shared error notice, with the cause (2026-10-13; was a bare red line).
        <ErrorNotice error={error}>Couldn&apos;t work out the approvals right now.</ErrorNotice>
      );
    }
    if (!preview) {
      return loading ? <CircularProgress size={18} aria-label="Working out the approvals" /> : null;
    }
    if (preview.invalid.length) {
      return (
        <Typography variant="body2" color="text.secondary">
          {preview.invalid.length === 1 && preview.invalid[0].field === "sfOpportunityId"
            ? "Choose the account and opportunity to see who approves."
            : "The approvals appear once the draft can be saved."}
        </Typography>
      );
    }
    return (
      <Stack spacing={1.5}>
        {showBlockers && preview.blockers.length ? (
          <Alert severity="error">
            The approvals can&apos;t be worked out, so this can&apos;t be submitted:
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {preview.blockers.map((b) => (
                <li key={b.field + b.message}>{b.message}</li>
              ))}
            </Box>
          </Alert>
        ) : null}
        <LazyApprovalDiagram steps={preview.steps} />
        {preview.notes.length ? (
          <Alert severity="info">
            {preview.notes.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </Alert>
        ) : null}
        {preview.pending.length ? (
          <Stack spacing={0.25}>
            {preview.pending.map((p) => (
              <Typography key={p} variant="caption" color="text.secondary">
                Not checked yet: {p}
              </Typography>
            ))}
          </Stack>
        ) : null}
      </Stack>
    );
  })();

  if (bare) return <Box aria-busy={loading}>{body}</Box>;
  return (
    <Box aria-busy={loading}>
      <SectionCard
        title="Who Approves If You Submit Now"
        icon={<ShieldCheckIcon size={18} />}
        aside={loading && preview ? <CircularProgress size={14} aria-label="Updating the approvals" /> : undefined}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Deal Desk goes first; the discount and commercial approvals then run in parallel. Nothing is sent until you submit.
        </Typography>
        {body}
      </SectionCard>
    </Box>
  );
}
