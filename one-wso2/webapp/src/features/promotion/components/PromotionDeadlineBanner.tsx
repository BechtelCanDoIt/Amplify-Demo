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

import type { ReactNode } from "react";
import { Alert } from "@wso2/oxygen-ui";

// The amber warning banner source repeats verbatim across its own
// role-scoped screens (recommendationList.tsx's lead deadline warning,
// submittedRequests.tsx's functional-lead deadline warning) — same
// colours, same shape, different copy — pulled out once here rather than
// copied a third time for the Functional Lead Portal.
export default function PromotionDeadlineBanner({ children }: { children: ReactNode }) {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      {children}
    </Alert>
  );
}
