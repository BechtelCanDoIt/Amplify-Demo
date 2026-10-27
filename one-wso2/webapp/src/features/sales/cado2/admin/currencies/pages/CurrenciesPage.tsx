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

import { useState, type FormEvent, type JSX } from "react";
import {
  Button,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { CoinsIcon, PlusIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import { useAddCurrency, useAdminCurrencies, useSetCurrencyActive } from "@features/sales/cado2/admin/currencies/api/useAdminCurrencies";

/**
 * CadO2 Admin → Currencies: the currencies reps can quote in.
 * A currency is added only if Salesforce has prices in it, and switched off
 * rather than deleted: switching one off stops new quotes in it, while
 * drafts already in it keep working.
 */
export default function CurrenciesPage(): JSX.Element {
  const list = useAdminCurrencies();
  const add = useAddCurrency();
  const toggle = useSetCurrencyActive();
  const notify = useCado2Toast();
  const [code, setCode] = useState("");
  // Switching a currency off asks first; on is instant (2026-10-13).
  const [stopping, setStopping] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const iso = code.trim().toUpperCase();
    if (!iso) return;
    toggle.reset();
    add.mutate(iso, {
      onSuccess: () => {
        setCode("");
        notify(`${iso} added`);
      },
    });
  };
  const switching = toggle.isPending ? toggle.variables?.isoCode : undefined;

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <PageHeader title="Currencies" />

      <SectionCard title="Add a Currency" icon={<PlusIcon size={16} />}>
        <Stack component="form" onSubmit={submit} direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
          <TextField
            size="small"
            label="Currency code"
            placeholder="e.g. AUD"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              add.reset();
            }}
            helperText={add.error ? undefined : "Only a currency Salesforce has active products priced in"}
            slotProps={{ htmlInput: { maxLength: 3, style: { textTransform: "uppercase" } } }}
            sx={{ width: { sm: 260 } }}
          />
          <Button type="submit" variant="contained" disabled={!code.trim() || add.isPending}>
            {add.isPending ? "Checking Salesforce…" : "Add currency"}
          </Button>
        </Stack>
        {add.error ? (
          <ErrorNotice error={add.error} sx={{ mt: 1.5 }}>
            Couldn&apos;t add the currency.
          </ErrorNotice>
        ) : null}
      </SectionCard>

      <SectionCard
        title={list.data ? `Quote currencies (${list.data.filter((c) => c.isActive).length} active)` : "Quote currencies"}
        icon={<CoinsIcon size={16} />}
      >
        {toggle.error && !stopping ? (
          <ErrorNotice error={toggle.error} sx={{ mb: 1.5 }}>
            Couldn&apos;t change the currency.
          </ErrorNotice>
        ) : null}
        {list.error ? (
          <ErrorNotice error={list.error} onRetry={() => void list.refetch()} retrying={list.isFetching}>
            Couldn&apos;t load the currencies.
          </ErrorNotice>
        ) : list.isPending ? (
          <Skeleton variant="rounded" height={180} aria-label="Loading currencies" />
        ) : (
          <Stack spacing={1.5}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
              <Table size="small" aria-label="Quote currencies">
                <TableHead>
                  <TableRow>
                    <TableCell>Currency</TableCell>
                    <TableCell>Salesforce price books with prices in this currency</TableCell>
                    <TableCell>Last changed</TableCell>
                    <TableCell align="right">Offered to AMs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.data.map((c) => (
                    <TableRow key={c.isoCode} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                            {c.isoCode}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {c.pricebookCount === null ? (
                          <Typography variant="body2" color="text.secondary">
                            Couldn&apos;t check
                          </Typography>
                        ) : c.pricebookCount === 0 ? (
                          <Typography variant="body2" color="warning.main">
                            None: quotes can&apos;t be priced
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="body2">
                              {c.pricebookCount === 1 ? "1 price book" : `${c.pricebookCount} price books`}
                            </Typography>
                            {c.largestPricebookProducts ? (
                              <Typography variant="caption" color="text.secondary">
                                The fullest prices {c.largestPricebookProducts} products
                              </Typography>
                            ) : null}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {changedText(c.updatedAt, c.updatedByEmail)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Switch
                          checked={c.isActive}
                          disabled={switching !== undefined}
                          onChange={(_, on) => {
                            add.reset();
                            if (!on) {
                              toggle.reset();
                              setStopping(c.isoCode);
                              return;
                            }
                            toggle.mutate(
                              { isoCode: c.isoCode, isActive: true },
                              { onSuccess: () => notify(`${c.isoCode} offered`) },
                            );
                          }}
                          slotProps={{ input: { role: "switch", "aria-label": `Offer ${c.isoCode} to AMs` } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">
              Switching a currency off stops new quotes in it. Drafts already in it can still be saved and submitted; submitted
              quotes don&apos;t change.
            </Typography>
          </Stack>
        )}
      </SectionCard>

      {stopping ? (
        <LifecycleDialog
          title={`Stop offering ${stopping}?`}
          confirmLabel="Stop offering"
          danger
          pending={toggle.isPending}
          error={toggle.error}
          onClose={() => setStopping(null)}
          onConfirm={() =>
            toggle.mutate(
              { isoCode: stopping, isActive: false },
              {
                onSuccess: () => {
                  notify(`${stopping} no longer offered`);
                  setStopping(null);
                },
              },
            )
          }
        >
          New quotes can&apos;t be in {stopping}. Drafts already in it can still be saved and submitted; submitted quotes
          don&apos;t change. You can switch it on again.
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}
