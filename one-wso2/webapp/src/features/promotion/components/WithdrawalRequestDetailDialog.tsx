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

import { Dialog, DialogContent, DialogTitle, Typography } from "@wso2/oxygen-ui";
import { decodePromotionText } from "../util/promotionRichText";
import PromotionRichTextContent from "./PromotionRichTextContent";
import type { PromotionRequestFull } from "../api/types";

// The withdrawal card's own Request/Recommendations detail — a data grid's
// row-detail equivalent (MUI X DataGrid Community has no inline expand, same
// reason every other grid in this app opens a dialog on its own row action).
export default function WithdrawalRequestDetailDialog({
  request,
  onClose,
}: {
  request: PromotionRequestFull | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(request)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{request?.employeeEmail}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Request</Typography>
        <PromotionRichTextContent content={decodePromotionText(request?.promotionStatement)} />
        {request && request.recommendations.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>Recommendations</Typography>
            {request.recommendations.map((r) => (
              <Typography key={r.recommendationID} variant="body2" sx={{ mb: 1 }}>
                <strong>{r.leadEmail}</strong> — {r.recommendationStatus}
              </Typography>
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
