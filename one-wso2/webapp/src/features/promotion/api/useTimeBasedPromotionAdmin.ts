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

import { useMutation } from "@tanstack/react-query";
import { authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { promotionServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";

// POST /promotion/requests/time-based — bulk-imports TIME_BASED requests
// for the open cycle from a Google Sheet. Doesn't invalidate the request
// list itself: the import runs async server-side, and usePromotionSyncState
// ("TIME_BASED_PROMOTION_STATE") is what a caller polls to know when to
// refetch — matching source's own two-step flow (kick off the import here,
// react to the sync flag settling elsewhere).
export function useImportTimeBasedPromotions() {
  const getAccessToken = useAccessToken();
  return useMutation({
    mutationFn: async (googleSheetUrl: string) => {
      const accessToken = await getAccessToken();
      return authedPost(
        promotionServiceUrls.timeBasedPromotionImport(),
        accessToken,
        { type: "SHEET", sheet: googleSheetUrl },
        digiopsHeaders(),
      );
    },
  });
}
