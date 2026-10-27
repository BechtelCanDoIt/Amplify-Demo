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

import { useState } from "react";

// The row count for a server-paged grid, held at its last known value while a
// page has none to report. A page whose request fails has no data, and a count
// that fell to 0 then would make the grid move itself back to the first page —
// whose cached, successful query takes the failure, and its Retry, off screen.
export function useRetainedRowCount(totalCount: number | undefined): number {
  const [lastKnown, setLastKnown] = useState(totalCount ?? 0);
  if (totalCount !== undefined && totalCount !== lastKnown) {
    setLastKnown(totalCount);
  }
  return totalCount ?? lastKnown;
}
