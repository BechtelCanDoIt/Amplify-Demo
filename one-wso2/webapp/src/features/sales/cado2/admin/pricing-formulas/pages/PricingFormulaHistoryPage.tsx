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

import { useMemo, useState, type JSX } from "react";
import { useParams } from "react-router";
import { Box, Button, Chip, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import { HistoryIcon, PencilIcon, PlusIcon, Trash2Icon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { HttpError } from "@api/http";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import QuoteActionsMenu from "@features/sales/cado2/quotes/components/detail/QuoteActionsMenu";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";
import { formatDateTime } from "@features/sales/cado2/quotes/form/draftForm";
import { usePricingFormulas } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type { PricingFormula } from "@features/sales/cado2/quotes/api/quoteTypes";
import { usePricingFormulaVersions } from "@features/sales/cado2/admin/pricing-formulas/api/usePricingFormulaAdmin";
import FormulaEditorDialog from "@features/sales/cado2/admin/pricing-formulas/components/FormulaEditorDialog";
import RemoveFormulaDialog from "@features/sales/cado2/admin/pricing-formulas/components/RemoveFormulaDialog";
import { bindingsSummary, versionLabel } from "@features/sales/cado2/utils/pricingFormula";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

/** One version on the timeline: a dot and a line down to the next (older) one. */
function VersionItem({ v, inForce, last }: { v: PricingFormula; inForce: boolean; last: boolean }): JSX.Element {
  return (
    <Stack direction="row" spacing={2} component="li" aria-label={`Version ${v.version}`}>
      <Stack alignItems="center" sx={{ pt: 0.5 }} aria-hidden>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: 2,
            borderColor: inForce ? "primary.main" : "divider",
            bgcolor: inForce ? "primary.main" : "background.paper",
          }}
        />
        {last ? null : <Box sx={{ width: 2, flexGrow: 1, bgcolor: "divider", my: 0.5 }} />}
      </Stack>
      <Box sx={{ pb: last ? 0 : 3, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
          <Typography variant="subtitle2">v{v.version}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(v.updatedAt)} · {v.updatedByEmail}
          </Typography>
          {inForce ? <Chip size="small" color="primary" variant="outlined" label="In force" /> : null}
        </Stack>
        {v.status === "REMOVED" ? (
          <Chip size="small" variant="outlined" label="Removed" sx={{ mt: 0.75 }} />
        ) : (
          <>
            <Typography variant="body2" sx={{ ...MONO, mt: 0.5 }}>
              {v.expression}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {bindingsSummary(v.bindings)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Unit of measure: {v.unitOfMeasure}
            </Typography>
          </>
        )}
      </Box>
    </Stack>
  );
}

/**
 * CadO2 Admin → Pricing Formulas → one product (D82): its formula in force
 * (or that it was removed) and every version, newest first. Edit saves the
 * next version; Remove adds a REMOVED one; a removed formula can be added
 * back. Quotes keep the versions they were priced with.
 */
export default function PricingFormulaHistoryPage(): JSX.Element {
  const productId = useParams().productId ?? "";
  const versions = usePricingFormulaVersions(productId);
  const formulas = usePricingFormulas();
  const notify = useCado2Toast();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inForce = useMemo(
    () => new Map((formulas.data ?? []).filter((f) => f.status === "ACTIVE").map((f) => [f.productId, f])),
    [formulas.data],
  );

  const back = { to: cado2Paths.adminSection("pricing-formulas"), label: "Pricing Formulas" };
  if (versions.error) {
    const missing = versions.error instanceof HttpError && versions.error.status === 404;
    return (
      <Stack spacing={3} sx={{ maxWidth: 1100 }}>
        <PageHeader title="Pricing Formula" back={back} />
        {missing ? (
          <EmptyState icon={<HistoryIcon size={28} />} title="This product has no pricing formula" />
        ) : (
          <ErrorNotice error={versions.error} onRetry={() => void versions.refetch()} retrying={versions.isFetching}>
            Couldn&apos;t load the formula&apos;s versions.
          </ErrorNotice>
        )}
      </Stack>
    );
  }
  if (versions.isPending) {
    return <Skeleton variant="rounded" height={240} aria-label="Loading the formula" />;
  }

  const latest = versions.data[0];
  const active = latest.status === "ACTIVE";
  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <PageHeader
        back={back}
        title={latest.productName}
        chips={
          <>
            {latest.productCode ? <Chip size="small" variant="outlined" label={latest.productCode} sx={MONO} /> : null}
            <Chip
              size="small"
              variant="outlined"
              color={active ? "primary" : "default"}
              label={
                active
                  ? `In force: ${versionLabel(latest.version, latest.updatedAt)}`
                  : `Removed in ${versionLabel(latest.version, latest.updatedAt)}`
              }
            />
          </>
        }
        actions={
          active ? (
            <>
              <Button variant="contained" size="large" startIcon={<PencilIcon size={16} />} onClick={() => setEditing(true)}>
                Edit
              </Button>
              <QuoteActionsMenu
                actions={[]}
                destructive={[{ label: "Remove formula", icon: <Trash2Icon size={16} />, onClick: () => setRemoving(true) }]}
              />
            </>
          ) : (
            <Button variant="contained" size="large" startIcon={<PlusIcon size={16} />} onClick={() => setEditing(true)}>
              Add Formula
            </Button>
          )
        }
      />

      <SectionCard title="Version History" icon={<HistoryIcon size={16} />}>
        <Box component="ol" aria-label="Versions, newest first" sx={{ m: 0, p: 0, listStyle: "none" }}>
          {versions.data.map((v, i) => (
            <VersionItem key={v.versionId} v={v} inForce={i === 0 && active} last={i === versions.data.length - 1} />
          ))}
        </Box>
      </SectionCard>

      {editing ? (
        <FormulaEditorDialog
          formula={latest}
          saved={inForce}
          onClose={() => setEditing(false)}
          onSaved={(f) => {
            setEditing(false);
            notify(`Saved as v${f.version}`);
          }}
        />
      ) : null}
      {removing ? <RemoveFormulaDialog formula={latest} onClose={() => setRemoving(false)} /> : null}
    </Stack>
  );
}
