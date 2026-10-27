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
import { authedPatch } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { parServiceUrls } from "@config/apiConfig";
import { digiopsHeaders } from "@features/my/util/digiopsHeaders";

// PATCH .../reminders/schedule-360-reminders — no body, 202 on success.
// MultiTeamSummary.tsx's "Send 360° Reminder" button.
export function useSend360Reminder() {
  const getAccessToken = useAccessToken();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const accessToken = await getAccessToken();
      await authedPatch<void>(parServiceUrls.parSchedule360Reminders(), accessToken, {}, digiopsHeaders());
    },
  });
}
