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
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import type { PricingFormula } from "@features/sales/cado2/quotes/api/quoteTypes";
import { useDeletePricingFormula } from "@features/sales/cado2/admin/pricing-formulas/api/usePricingFormulaAdmin";

/**
 * Confirms removing a product's formula: a REMOVED version (D82). Quotes keep
 * the versions they were priced with. Mounted only while open.
 */
export default function RemoveFormulaDialog({
  formula,
  onClose,
}: {
  formula: PricingFormula;
  onClose: () => void;
}): JSX.Element {
  const remove = useDeletePricingFormula();
  const notify = useCado2Toast();
  return (
    <LifecycleDialog
      title={`Remove the formula of ${formula.productName}?`}
      confirmLabel="Remove formula"
      danger
      pending={remove.isPending}
      error={remove.error}
      onClose={onClose}
      onConfirm={() =>
        remove.mutate(
          { productId: formula.productId },
          {
            onSuccess: (f) => {
              onClose();
              notify(`Formula removed (v${f.version})`);
            },
          },
        )
      }
    >
      New lines of this product will be priced from the price book. Quotes that already use a version of this formula
      keep it; their AMs can move a draft&apos;s line to the price book themselves.
    </LifecycleDialog>
  );
}
