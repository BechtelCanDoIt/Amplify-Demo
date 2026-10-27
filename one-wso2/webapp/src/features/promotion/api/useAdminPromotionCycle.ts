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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedGet, authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { promotionServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";
import type { PromotionCycle } from "./types";

// POST /promotion/cycles — the "Create" form's own submit. All six dates
// are pre-formatted "YYYY-MM-DD" strings by the caller (the form itself),
// matching source's own dayjs().format("YYYY-MM-DD") on every field.
export interface PromotionCycleCreatePayload {
  name: string;
  startDate: string;
  endDate: string;
  leadDeadline: string;
  functionalLeadDeadline: string;
  promotionBoardDeadline: string;
}

export function useCreatePromotionCycle() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PromotionCycleCreatePayload) => {
      const accessToken = await getAccessToken();
      return authedPost<PromotionCycle>(promotionServiceUrls.promotionCycleCreate(), accessToken, payload, digiopsHeaders());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotion-cycles"] }),
  });
}

// GET .../cycles/{id}/end — ends the currently OPEN cycle. A bare GET with
// the action in the URL suffix, same convention as approve/reject
// elsewhere in this backend.
export function useEndPromotionCycle() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const accessToken = await getAccessToken();
      return authedGet(promotionServiceUrls.promotionCycleEnd(id), accessToken, digiopsHeaders());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promotion-cycles"] }),
  });
}
