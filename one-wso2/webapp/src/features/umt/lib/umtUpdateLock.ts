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

// While a demotion from Staging is in flight (DemoteStagingRequested), staging
// is torn down and the update then moves to Development on its own. Nothing on
// that update may change until it lands there; every other update stays
// editable.
export function umtIsUpdateLocked(lifecycleState: string | null | undefined): boolean {
  return lifecycleState === "DemoteStagingRequested";
}

export const UMT_UPDATE_LOCKED_MESSAGE =
  "This update is being demoted from Staging to Development. It can't be changed until the demotion finishes.";
