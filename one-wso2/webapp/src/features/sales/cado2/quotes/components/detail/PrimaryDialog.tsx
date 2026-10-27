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
import {
  useOpportunityQuotes,
  useSetPrimary,
} from "@features/sales/cado2/quotes/api/useQuoteApi";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import { primaryLabel } from "@features/sales/cado2/quotes/lifecycle/lifecycle";

interface PrimaryDialogProps {
  readonly quoteId: number;
  readonly opportunityId: string;
  /** Whether the quote is primary now: the dialog offers the opposite. */
  readonly isPrimary: boolean;
  readonly onClose: () => void;
}

/**
 * Confirms Make primary or Remove primary (D68), from the quote page or the
 * Quotes list. Making a quote primary names the quote it releases. A setting
 * of the quote: approvals aren't affected.
 */
export default function PrimaryDialog({
  quoteId,
  opportunityId,
  isPrimary,
  onClose,
}: PrimaryDialogProps): JSX.Element {
  const setPrimary = useSetPrimary();
  const notify = useCado2Toast();
  const quotes = useOpportunityQuotes(opportunityId);
  const current = quotes.data?.find(
    (o) => o.isPrimary && o.quoteId !== quoteId,
  );
  return (
    <LifecycleDialog
      title={isPrimary ? "Remove primary?" : "Make this the primary quote?"}
      confirmLabel={isPrimary ? "Remove primary" : "Make primary"}
      pending={setPrimary.isPending}
      error={setPrimary.error}
      onClose={onClose}
      onConfirm={() =>
        setPrimary.mutate(
          { quoteId, primary: !isPrimary },
          {
            onSuccess: () => {
              notify(isPrimary ? "No longer the primary quote" : "Now the primary quote");
              onClose();
            },
          },
        )
      }
    >
      {isPrimary
        ? "The opportunity will have no primary quote, so nothing is synced to Salesforce until one is chosen."
        : current
          ? `${primaryLabel(current)} is the primary quote for this opportunity. Making this quote primary releases it. Approvals aren't affected.`
          : "This quote becomes the one synced to Salesforce. Approvals aren't affected."}
    </LifecycleDialog>
  );
}
