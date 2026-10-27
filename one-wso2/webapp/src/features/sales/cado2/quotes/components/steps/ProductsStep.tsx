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
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import {
  Alert,
  AlertTitle,
  Button,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { ChartColumnIcon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import OrderFormTable from "@features/sales/cado2/quotes/components/sheet/OrderFormTable";
import DealFiguresSection from "@features/sales/cado2/quotes/components/sheet/DealFiguresSection";
import ScheduleTable from "@features/sales/cado2/quotes/components/sheet/ScheduleTable";
import { hasYearlySchedule, orderForm, sheetFromForm, termShort } from "@features/sales/cado2/quotes/sheet/sheetModel";
import type { PricingPreview } from "@features/sales/cado2/quotes/api/quoteTypes";
import {
  hasRecurring,
  isPartnerLed,
  termEnd,
  type DraftFormValues,
  type LineValue,
} from "@features/sales/cado2/quotes/form/draftForm";
import AddLineDialog from "@features/sales/cado2/quotes/components/AddLineDialog";
import SubscriptionTermCard from "@features/sales/cado2/quotes/components/SubscriptionTermCard";
import PartnerCommissionCard from "@features/sales/cado2/quotes/components/PartnerCommissionCard";
import PricingSetupCard from "@features/sales/cado2/quotes/components/PricingSetupCard";
import { useFieldIssue } from "@features/sales/cado2/quotes/components/fieldIssues";

interface ProductsStepProps {
  /** The latest live preview, if the quote could be priced. */
  readonly preview: PricingPreview | null;
}

function LineIssue({ index }: { index: number }) {
  const issues = [
    useFieldIssue(`lines[${index}].pricebookEntryId`),
    useFieldIssue(`lines[${index}].quantity`),
    useFieldIssue(`lines[${index}].discretionaryDiscountPercent`),
    useFieldIssue(`lines[${index}]`),
  ].filter(Boolean);
  if (issues.length === 0) return null;
  return (
    <TableRow>
      <TableCell colSpan={7} sx={{ pt: 0, borderTop: 0 }}>
        <Typography variant="caption" color="error">
          {issues.join(" · ")}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

/**
 * Step ② Products & Pricing (D86): the products, priced from the
 * opportunity's price book, then each section that changes the amounts, top
 * to bottom, with the figures last:
 *
 *   Products → Subscription Term → Partner Commission → Deal Figures → Yearly Schedule
 *
 * Billing and payment terms are on Commercials.
 *
 * A new quote's
 * products are brought in from the opportunity (D72); one not mapped to a
 * category says so on its line, and is chosen in the line's dialog.
 */
export default function ProductsStep({ preview }: ProductsStepProps): JSX.Element {
  const { control, getValues } = useFormContext<DraftFormValues>();
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "lines",
  });
  const values = useWatch({ control }) as DraftFormValues;
  const [editing, setEditing] = useState<{
    open: boolean;
    index: number | null;
  }>({ open: false, index: null });
  const linesIssue = useFieldIssue("lines");

  const currency = values.currencyIsoCode;
  // The opportunity's book must be usable; the card says what to fix otherwise.
  // Products can be added before the start date (D78); they are priced once it is chosen.
  const ready = Boolean(currency && values.defaultPricebookId);
  // Why the amounts are blank.
  const amountsHint =
    preview || values.lines.length === 0
      ? null
      : !values.startDate
        ? "Amounts appear once the start date is chosen."
        : hasRecurring(values.lines) && !termEnd(values)
          ? "Amounts appear once the term is chosen."
          : null;
  // The same lines, amounts and figures as the Review step's sheet.
  const sheet = useMemo(() => sheetFromForm(values, preview, null), [values, preview]);

  const onSave = (line: LineValue) => {
    if (editing.index === null) append(line);
    else update(editing.index, line);
    setEditing({ open: false, index: null });
  };

  const addButton = (
    <Button
      variant="contained"
      startIcon={<PlusIcon size={16} />}
      disabled={!ready}
      onClick={() => setEditing({ open: true, index: null })}
    >
      Add product
    </Button>
  );

  return (
    <Stack spacing={2.5}>
      {linesIssue ? <Alert severity="error">{linesIssue}</Alert> : null}

      {/* When it starts and how long it runs: set first, since the amounts
          below depend on it (D90). */}
      <SubscriptionTermCard />

      {/* The opportunity's currency and price book, locked. */}
      <PricingSetupCard />

      {values.notBroughtIn?.length ? (
        <Alert severity="info" variant="outlined">
          <AlertTitle>Not brought in from Salesforce ({values.notBroughtIn.length})</AlertTitle>
          {values.notBroughtIn.map((n) => `${n.productName}: ${n.reason}`).join(" · ")}
        </Alert>
      ) : null}

      {/* Partner-led: the commission, right above the products whose totals it
          changes (D91); shown before any product too. */}
      {isPartnerLed(values) ? (
        <PartnerCommissionCard
          commission={orderForm(sheet.lines, sheet.partnerCommissionPercent).commission}
          total={orderForm(sheet.lines).total}
          currency={currency}
        />
      ) : null}

      <SectionCard title="Products" icon={<PackageIcon size={18} />} aside={fields.length > 0 ? addButton : undefined}>
        {fields.length === 0 ? (
          <EmptyState
            compact
            icon={<PackageIcon size={20} />}
            title="No products yet"
            // One price book: the opportunity's (D57), named.
            body={`Add products from ${values.defaultPricebookName ? `the ${values.defaultPricebookName} price book` : "the quote's price book"}. Prices come from this price book.`}
            action={addButton}
          />
        ) : (
          <OrderFormTable
            lines={sheet.lines}
            currency={currency}
            commissionPercent={sheet.partnerCommissionPercent}
            actions={(i) => (
              <>
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label={`Edit line ${i + 1}`} onClick={() => setEditing({ open: true, index: i })}>
                    <PencilIcon size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove">
                  <IconButton size="small" aria-label={`Remove line ${i + 1}`} onClick={() => remove(i)}>
                    <Trash2Icon size={16} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            below={(i) => <LineIssue key={fields[i]?.id} index={i} />}
            flagUncategorised
            duration={termShort(sheet)}
          />
        )}
        {amountsHint ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {amountsHint}
          </Typography>
        ) : null}
      </SectionCard>

      {fields.length > 0 ? <DealFiguresSection sheet={sheet} /> : null}

      {hasYearlySchedule(sheet) ? (
        <SectionCard title="Yearly Schedule" icon={<ChartColumnIcon size={18} />}>
          <ScheduleTable years={sheet.years} lines={sheet.lines} netOfCommission={sheet.partnerCommissionPercent !== null} />
        </SectionCard>
      ) : null}

      {editing.open && values.defaultPricebookId ? (
        <AddLineDialog
          key={editing.index ?? "new"}
          open
          line={editing.index === null ? null : getValues(`lines.${editing.index}`)}
          currency={currency}
          pricebook={{ id: values.defaultPricebookId, name: values.defaultPricebookName }}
          onSave={onSave}
          onClose={() => setEditing({ open: false, index: null })}
        />
      ) : null}
    </Stack>
  );
}

