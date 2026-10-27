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
import { Typography } from "@wso2/oxygen-ui";
import { PackageIcon } from "@wso2/oxygen-ui-icons-react";
import { termShort, type QuoteSheet } from "@features/sales/cado2/quotes/sheet/sheetModel";
import SheetCard from "@features/sales/cado2/components/section-card/SectionCard";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import OrderFormTable from "./OrderFormTable";

/** Every line, as on the order form. */
export default function ProductsSection({ sheet }: { sheet: QuoteSheet }): JSX.Element {
  return (
    <SheetCard
      title="Products"
      icon={<PackageIcon size={18} />}
      aside={
        <Typography variant="body2" color="text.secondary">
          {sheet.lines.length} line{sheet.lines.length === 1 ? "" : "s"}
        </Typography>
      }
    >
      {sheet.lines.length === 0 ? (
        <EmptyState compact icon={<PackageIcon size={20} />} title="No products yet" />
      ) : (
        <OrderFormTable
          lines={sheet.lines}
          currency={sheet.currency}
          commissionPercent={sheet.partnerCommissionPercent}
          duration={termShort(sheet)}
        />
      )}
    </SheetCard>
  );
}
