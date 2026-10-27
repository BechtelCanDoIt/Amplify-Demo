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
import { ChartColumnIcon } from "@wso2/oxygen-ui-icons-react";
import { hasYearlySchedule, type QuoteSheet } from "@features/sales/cado2/quotes/sheet/sheetModel";
import SheetCard from "@features/sales/cado2/components/section-card/SectionCard";
import ScheduleTable from "./ScheduleTable";

/** The yearly schedule, for a term over more than one contract year only. */
export default function ScheduleSection({ sheet }: { sheet: QuoteSheet }): JSX.Element | null {
  if (!hasYearlySchedule(sheet)) return null;
  return (
    <SheetCard title="Yearly Schedule" icon={<ChartColumnIcon size={18} />}>
      <ScheduleTable years={sheet.years} lines={sheet.lines} netOfCommission={sheet.partnerCommissionPercent !== null} />
    </SheetCard>
  );
}
