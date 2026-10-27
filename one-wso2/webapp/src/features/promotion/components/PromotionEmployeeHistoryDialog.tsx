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

import { Alert, Dialog, DialogContent, DialogTitle, Skeleton } from "@wso2/oxygen-ui";
import { humanizeHttpError } from "@api/http";
import { usePromotionEmployeeInfo } from "../api/usePromotionEmployeeInfo";
import { usePromotionHistory } from "../api/usePromotionHistory";
import PromotionTimeline from "./PromotionTimeline";

// Ports source's own per-employee history popup — both Team Promotion
// History tabs (employeesHistory.tsx, indirectReports.tsx) open the exact
// same Dialog + PromotionTimeLine on their row's "eye" action, so this is
// one shared component instead of two copies. Reuses the same two
// endpoints/hooks §2 (/me/promotion) already reads and the same
// PromotionTimeline rendering — a lead viewing a report's history sees
// literally the same timeline that report sees of their own.
export default function PromotionEmployeeHistoryDialog({
  workEmail,
  onClose,
}: {
  workEmail: string | null;
  onClose: () => void;
}) {
  const info = usePromotionEmployeeInfo(workEmail ?? undefined);
  const history = usePromotionHistory(workEmail ?? undefined, Boolean(workEmail));

  return (
    <Dialog open={Boolean(workEmail)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Promotion History – {workEmail}</DialogTitle>
      <DialogContent dividers>
        {info.isPending || history.isPending ? (
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
        ) : info.isError ? (
          <Alert severity="error">Couldn&apos;t load this employee&apos;s record. {humanizeHttpError(info.error)}</Alert>
        ) : history.isError ? (
          <Alert severity="error">Couldn&apos;t load promotion history. {humanizeHttpError(history.error)}</Alert>
        ) : info.data ? (
          <PromotionTimeline employeeInfo={info.data.employeeInfo} requests={history.data?.promotionRequests ?? []} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
