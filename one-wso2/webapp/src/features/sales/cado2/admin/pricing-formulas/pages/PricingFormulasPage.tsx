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
import { Link as RouterLink } from "react-router";
import {
  Button,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@wso2/oxygen-ui";
import { ArchiveIcon, PencilIcon, PlusIcon, SigmaIcon, Trash2Icon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import { cado2Paths } from "@features/sales/cado2/cado2Paths";
import { usePricingFormulas } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type { PricingFormula } from "@features/sales/cado2/quotes/api/quoteTypes";
import FormulaEditorDialog from "@features/sales/cado2/admin/pricing-formulas/components/FormulaEditorDialog";
import RemoveFormulaDialog from "@features/sales/cado2/admin/pricing-formulas/components/RemoveFormulaDialog";
import { bindingsSummary, versionLabel } from "@features/sales/cado2/utils/pricingFormula";

const MONO = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

/**
 * CadO2 Admin → Pricing Formulas (D81): a product whose price is worked out
 * on the quote rather than taken from the price book, e.g. Enterprise Support
 * at "the higher of 25,000 or 10% of the subscriptions". A formula line has
 * no discount. Every change is a new version, a removal too (D82); quotes
 * keep the version they were priced with, so nothing here touches them. Each
 * product's versions are on its own page.
 */
export default function PricingFormulasPage(): JSX.Element {
  const formulas = usePricingFormulas();
  const notify = useCado2Toast();
  // undefined: closed; null: a new formula.
  const [editing, setEditing] = useState<PricingFormula | null | undefined>(undefined);
  const [removing, setRemoving] = useState<PricingFormula | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);

  // A removed formula's latest version is REMOVED: listed apart, collapsed.
  const inForce = useMemo(() => (formulas.data ?? []).filter((f) => f.status === "ACTIVE"), [formulas.data]);
  const removed = useMemo(() => (formulas.data ?? []).filter((f) => f.status === "REMOVED"), [formulas.data]);
  const byProduct = useMemo(() => new Map(inForce.map((f) => [f.productId, f])), [inForce]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100 }}>
      <PageHeader
        title="Pricing Formulas"
        actions={
          <Button variant="contained" size="large" startIcon={<PlusIcon size={16} />} onClick={() => setEditing(null)}>
            New Formula
          </Button>
        }
      />

      <SectionCard title={formulas.data ? `Formulas (${inForce.length})` : "Formulas"} icon={<SigmaIcon size={16} />}>
        {formulas.error ? (
          <ErrorNotice error={formulas.error} onRetry={() => void formulas.refetch()} retrying={formulas.isFetching}>
            Couldn&apos;t load the formulas.
          </ErrorNotice>
        ) : formulas.isPending ? (
          <Skeleton variant="rounded" height={140} aria-label="Loading formulas" />
        ) : inForce.length === 0 ? (
          <EmptyState
            compact
            icon={<SigmaIcon size={28} />}
            title="No pricing formulas yet"
            body="Every product is priced from its price book. Add a formula for a product whose price depends on the rest of the quote."
          />
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small" aria-label="Pricing formulas">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Formula</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {inForce.map((f) => (
                  <TableRow key={f.productId} hover>
                    <TableCell sx={{ width: 260 }}>
                      <Link
                        component={RouterLink}
                        to={cado2Paths.adminPricingFormula(f.productId)}
                        variant="body2"
                        sx={{ fontWeight: 600 }}
                      >
                        {f.productName}
                      </Link>
                      {f.productCode ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {f.productCode}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={MONO}>
                        {f.expression}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {bindingsSummary(f.bindings)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Unit of measure: {f.unitOfMeasure}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2">v{f.version}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {changedText(f.updatedAt, f.updatedByEmail)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton
                        size="small"
                        aria-label={`Edit the formula of ${f.productName}`}
                        title="Edit"
                        onClick={() => setEditing(f)}
                      >
                        <PencilIcon size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Remove the formula of ${f.productName}`}
                        title="Remove"
                        onClick={() => setRemoving(f)}
                      >
                        <Trash2Icon size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      {removed.length ? (
        <SectionCard
          title={`Removed Formulas (${removed.length})`}
          icon={<ArchiveIcon size={16} />}
          aside={
            <Button size="small" onClick={() => setShowRemoved(!showRemoved)} aria-expanded={showRemoved}>
              {showRemoved ? "Hide" : "Show"}
            </Button>
          }
        >
          {showRemoved ? (
            <Stack component="ul" spacing={1} aria-label="Removed formulas" sx={{ m: 0, p: 0, listStyle: "none" }}>
              {removed.map((f) => (
                <Stack component="li" key={f.productId} direction="row" spacing={1} alignItems="baseline">
                  <Link component={RouterLink} to={cado2Paths.adminPricingFormula(f.productId)} variant="body2">
                    {f.productName}
                  </Link>
                  <Typography variant="caption" color="text.secondary">
                    removed in {versionLabel(f.version, f.updatedAt)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Their version history stays on each product&apos;s page.
            </Typography>
          )}
        </SectionCard>
      ) : null}

      {editing !== undefined ? (
        <FormulaEditorDialog
          formula={editing}
          saved={byProduct}
          onClose={() => setEditing(undefined)}
          onSaved={(f) => {
            setEditing(undefined);
            notify(`Saved as v${f.version}`);
          }}
        />
      ) : null}

      {removing ? <RemoveFormulaDialog formula={removing} onClose={() => setRemoving(null)} /> : null}
    </Stack>
  );
}
