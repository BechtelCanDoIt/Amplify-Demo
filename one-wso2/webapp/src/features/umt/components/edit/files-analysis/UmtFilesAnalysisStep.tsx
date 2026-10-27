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

import { useEffect, useState } from "react";
import { Divider, Stack } from "@wso2/oxygen-ui";
import type { UmtUpdateSummary } from "../../../api/umtUpdates";
import { useUmtIsAdvancingToPrAnalyzed } from "../../../api/useUmtPrAnalysis";
import UmtPrAnalysisStep from "../pr-analysis/UmtPrAnalysisStep";
import UmtProductAnalysisStep from "../product-analysis/UmtProductAnalysisStep";

// Development shows the PR analysis alone; PRAnalyzed adds the product
// analysis below it, once the run that got it there has finished.
export default function UmtFilesAnalysisStep({
  id,
  update,
  onDirtyChange,
}: {
  id: string;
  update: UmtUpdateSummary;
  // True while either analysis has changes it hasn't analysed yet, so the
  // shell's Proceed can ask first.
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  const isAdvancing = useUmtIsAdvancingToPrAnalyzed(id);
  const [isPrAnalysisDirty, setIsPrAnalysisDirty] = useState(false);
  const [isProductAnalysisDirty, setIsProductAnalysisDirty] = useState(false);
  const isDirty = isPrAnalysisDirty || isProductAnalysisDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <Stack spacing={3}>
      <UmtPrAnalysisStep id={id} update={update} onDirtyChange={setIsPrAnalysisDirty} />
      {update.lifecycleState === "PRAnalyzed" && !isAdvancing && (
        <>
          <Divider />
          <UmtProductAnalysisStep id={id} update={update} onDirtyChange={setIsProductAnalysisDirty} />
        </>
      )}
    </Stack>
  );
}
