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

import { useEffect, type JSX } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Alert, AlertTitle, InputAdornment, Stack, TextField } from "@wso2/oxygen-ui";
import { CoinsIcon, LockIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useAccountOpportunities, useCurrencies, usePricebooks } from "@features/sales/cado2/quotes/api/useQuoteApi";
import { useFieldIssue } from "@features/sales/cado2/quotes/components/fieldIssues";
import type { DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";

const FROM_SALESFORCE = "From the Salesforce opportunity";

/**
 * The quote's currency and price book: the Salesforce opportunity's, shown
 * locked. Salesforce allows one price book per opportunity, so the
 * quote can't differ. If Salesforce lacks something, this says exactly what
 * to fix there, and no products can be added until it is fixed:
 *
 *   no currency · a currency CadO2 doesn't offer · no price book ·
 *   a book that's inactive or has no active products in the currency
 *
 * The form follows the opportunity, so a fix in Salesforce shows on reload;
 * the backend takes both from Salesforce on every save.
 */
export default function PricingSetupCard(): JSX.Element {
  const { control, setValue } = useFormContext<DraftFormValues>();
  const [accountId, opportunityId, currency, bookId, bookName] = useWatch({
    control,
    name: ["accountId", "opportunityId", "currencyIsoCode", "defaultPricebookId", "defaultPricebookName"],
  });
  const currencies = useCurrencies();
  const opportunities = useAccountOpportunities(accountId || null);
  const opportunity = opportunities.data?.find((o) => o.id === opportunityId);
  const sfCurrency = opportunity?.currencyIsoCode ?? null;
  const sfBook = opportunity?.pricebook ?? null;
  // A draft already in a currency an Admin has since switched off keeps it.
  const offered = Boolean(sfCurrency && (currencies.data?.includes(sfCurrency) || currency === sfCurrency));
  const books = usePricebooks(opportunity && offered && sfCurrency ? sfCurrency : "");
  const usable = Boolean(sfBook && books.data?.some((b) => b.id === sfBook.id));
  const currencyIssue = useFieldIssue("currencyIsoCode");
  const bookIssue = useFieldIssue("defaultPricebookId");

  // What's wrong in Salesforce, if anything; null while it's still loading.
  const problem = !opportunity
    ? null
    : !sfCurrency
      ? "The opportunity has no currency in Salesforce. Set it there, then reload this quote."
      : currencies.data && !offered
        ? `The opportunity is in ${sfCurrency}, which CADO2 doesn't offer. Ask an Admin to add ${sfCurrency}, or change the opportunity's currency in Salesforce, then reload this quote.`
        : !sfBook
          ? "The opportunity has no price book in Salesforce. Set its price book there, then reload this quote."
          : books.data && !usable
            ? `The opportunity's price book, ${sfBook.name ?? sfBook.id}, is inactive in Salesforce or has no active products in ${sfCurrency}. Fix it in Salesforce, then reload this quote.`
            : null;

  // The form follows the opportunity (the backend does the same on save).
  useEffect(() => {
    if (!opportunity || !currencies.data) return;
    const nextCurrency = offered && sfCurrency ? sfCurrency : "";
    if (currency !== nextCurrency) setValue("currencyIsoCode", nextCurrency, { shouldDirty: true });
    if (nextCurrency && sfBook && !books.data) return; // the book's check is still loading
    const next = usable && sfBook ? sfBook : null;
    if (bookId !== (next?.id ?? "")) {
      setValue("defaultPricebookId", next?.id ?? "", { shouldDirty: true });
      setValue("defaultPricebookName", next?.name ?? "", { shouldDirty: true });
    }
  }, [opportunity, currencies.data, offered, sfCurrency, sfBook, books.data, usable, currency, bookId, setValue]);

  const locked = { input: { readOnly: true, endAdornment: <InputAdornment position="end"><LockIcon size={14} /></InputAdornment> } };
  return (
    <SectionCard title="Currency & Price Book" icon={<CoinsIcon size={18} />}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Currency"
            value={currency || "—"}
            size="small"
            error={Boolean(currencyIssue) && !problem}
            helperText={(!problem && currencyIssue) || FROM_SALESFORCE}
            slotProps={locked}
            sx={{ width: { sm: 160 } }}
          />
          <TextField
            label="Price book"
            value={bookId ? bookName : "—"}
            size="small"
            error={Boolean(bookIssue) && !problem}
            helperText={(!problem && bookIssue) || FROM_SALESFORCE}
            slotProps={locked}
            sx={{ flexGrow: 1 }}
          />
        </Stack>
        {problem ? (
          <Alert severity="error">
            <AlertTitle>Products can&apos;t be added</AlertTitle>
            {problem}
          </Alert>
        ) : books.error ? (
          <ErrorNotice error={books.error} onRetry={() => void books.refetch()} retrying={books.isFetching}>
            Couldn&apos;t check the opportunity&apos;s price book.
          </ErrorNotice>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
