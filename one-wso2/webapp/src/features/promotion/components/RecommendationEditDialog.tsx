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

import { Dialog, DialogContent } from "@wso2/oxygen-ui";
import RecommendationEditForm from "./RecommendationEditForm";
import type { PromotionRecommendation } from "../api/types";

// Wraps RecommendationEditForm in a Dialog for the Lead Portal's Pending
// Requests grid's own "Start" row action — the same "Dialog replaces inline
// expand" pattern every other grid in this app already uses for its own row
// actions, since MUI X DataGrid Community has no inline row-detail expand.
export default function RecommendationEditDialog({
  recommendation,
  leadEmail,
  onClose,
}: {
  recommendation: PromotionRecommendation | null;
  leadEmail: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(recommendation)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent dividers>
        {recommendation && (
          <RecommendationEditForm
            key={recommendation.recommendationID}
            recommendation={recommendation}
            leadEmail={leadEmail}
            onBack={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
