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
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import { useDeleteDraft } from "@features/sales/cado2/quotes/api/useQuoteApi";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import { STATUS_LABEL } from "@features/sales/cado2/quotes/lifecycle/lifecycle";
import type { DeleteDraftResult, QuoteView } from "@features/sales/cado2/quotes/api/quoteTypes";

interface DeleteDraftDialogProps {
  readonly quote: QuoteView;
  /** quoteLabel(): the number, or "account · opportunity" before the first submit. */
  readonly name: string;
  /** The draft: the quote's latest version. */
  readonly versionNumber: number;
  /** The draft's updatedAt as loaded: a draft saved since isn't deleted unseen. */
  readonly updatedAt: string;
  readonly onDeleted: (res: DeleteDraftResult) => void;
  readonly onClose: () => void;
}

/**
 * Confirms deleting a draft. A later version gives way to the one
 * before it; an only version takes the whole quote with it. Either way it
 * can't be undone, and it says so.
 */
export default function DeleteDraftDialog({ quote, name, versionNumber, updatedAt, onDeleted, onClose }: DeleteDraftDialogProps): JSX.Element {
  const del = useDeleteDraft();
  const notify = useCado2Toast();
  const previous = quote.versions.find((v) => v.versionNumber === versionNumber - 1);
  const only = !previous;
  return (
    <LifecycleDialog
      title={only ? (quote.quoteNumber ? `Delete ${name}?` : "Delete this draft quote?") : `Delete draft v${versionNumber}?`}
      confirmLabel={only ? "Delete quote" : "Delete draft"}
      danger
      pending={del.isPending}
      error={del.error}
      onClose={onClose}
      onConfirm={() =>
        del.mutate({ quoteId: quote.id, version: versionNumber, expectedUpdatedAt: updatedAt }, {
          onSuccess: (res) => {
            // Here rather than in each caller: the quote page, the wizard and the list.
            notify(res.quoteDeleted ? "Quote deleted" : `Draft v${versionNumber} deleted`);
            onDeleted(res);
          },
        })
      }
    >
      {only
        ? `This quote only has a draft, so ${name} is removed completely. This can't be undone.`
        : `The draft and its changes are removed. Version ${previous.versionNumber} (${STATUS_LABEL[previous.status]}) becomes the latest again. This can't be undone.`}
    </LifecycleDialog>
  );
}
