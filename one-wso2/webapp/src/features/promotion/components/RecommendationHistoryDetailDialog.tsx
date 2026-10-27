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
import type { PromotionRecommendation } from "../api/types";

// A SUBMITTED/DECLINED recommendation's own statement/comment/decline
// reason — the data grid's row-detail equivalent (MUI X DataGrid Community
// has no inline expand, same reason every other grid in this app opens a
// dialog on its own row actions). An EXPIRED row has nothing further to
// show and never reaches this dialog at all.
export default function RecommendationHistoryDetailDialog({
  recommendation,
  onClose,
}: {
  recommendation: PromotionRecommendation | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(recommendation)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{recommendation?.employeeName}</DialogTitle>
      <DialogContent dividers>
        {recommendation?.recommendationStatus === "SUBMITTED" && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Your Recommendation</Typography>
            <PromotionRichTextContent content={decodePromotionText(recommendation.recommendationStatement)} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>Additional Comment</Typography>
            <PromotionRichTextContent content={decodePromotionText(recommendation.recommendationAdditionalComment)} />
            {(recommendation.promotionRequestStatus === "REJECTED" ||
              recommendation.promotionRequestStatus === "FL_REJECTED") && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
                  Reason for the Rejection
                </Typography>
                <PromotionRichTextContent content={decodePromotionText(recommendation.reasonForRejection)} />
              </>
            )}
          </>
        )}
        {recommendation?.recommendationStatus === "DECLINED" && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Reason for Decline</Typography>
            <PromotionRichTextContent content={decodePromotionText(recommendation.recommendationAdditionalComment)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
