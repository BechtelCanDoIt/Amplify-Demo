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

import { lazy, Suspense, type JSX } from "react";
import { Box, CircularProgress } from "@wso2/oxygen-ui";
import type { ApprovalStep } from "@features/sales/cado2/approvals/api/approvalTypes";

// React Flow loads only when a graph is first shown.
const ApprovalDiagram = lazy(() => import("./ApprovalDiagram"));

/** The approval graph, loaded on first use. */
export default function LazyApprovalDiagram({ steps }: { steps: readonly ApprovalStep[] }): JSX.Element {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress size={22} aria-label="Drawing the approvals" />
        </Box>
      }
    >
      <ApprovalDiagram steps={steps} />
    </Suspense>
  );
}
