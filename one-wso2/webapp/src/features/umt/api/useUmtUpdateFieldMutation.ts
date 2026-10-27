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
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedPut } from "@api/http";
import { umtServiceUrls } from "@config/apiConfig";
import { useAccessToken } from "@hooks/useAccessToken";

export type UmtEditableUpdateField = "assignedTo" | "developedBy" | "worstCaseEstimate";

// A new worst-case estimate travels with the reason for it: the backend
// quotes that reason in the updated-ETA comment it posts on the customer's
// case and on the update's issues.
export type UmtUpdateFieldChange =
  | { field: "assignedTo" | "developedBy"; value: string }
  | { field: "worstCaseEstimate"; value: string; reason: string };

export function useUmtUpdateFieldMutation(id: string) {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UmtUpdateFieldChange>({
    mutationFn: async (change) => {
      const accessToken = await getAccessToken();
      if (change.field === "worstCaseEstimate") {
        await authedPut(umtServiceUrls.updateWorstCaseEstimate(id), accessToken, {
          worstCaseEstimate: change.value,
          reason: change.reason.trim(),
        });
        return;
      }
      await authedPut(umtServiceUrls.update(id), accessToken, { [change.field]: change.value });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["umt-update"] }),
        queryClient.invalidateQueries({ queryKey: ["umt-updates"] }),
      ]);
    },
  });
}
