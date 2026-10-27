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

import { Alert, CircularProgress, Stack, Typography } from "@wso2/oxygen-ui";
import { useSearchParams } from "react-router";
import DueDiligenceShell from "@features/due-diligence/components/DueDiligenceShell";
import { DUE_DILIGENCE_EYEBROW } from "@constants/dueDiligenceApps";
import { useDueDiligenceFile } from "@features/due-diligence/shared/api/useDueDiligenceFile";

// Ported from the source app's Finance/ViewImage.js + Legal/ViewImage.js —
// ONE shared viewer for both, parameterized by the fileName/extension query
// params (same reasoning as ViewPdfPage).
export default function ViewImagePage() {
  const [params] = useSearchParams();
  const fileName = params.get("fileName");
  const extension = params.get("extension");
  const file = useDueDiligenceFile(fileName, extension);

  return (
    <DueDiligenceShell eyebrow={DUE_DILIGENCE_EYEBROW} title="Document">
      {!fileName ? (
        <Alert severity="info">No document specified.</Alert>
      ) : file.isLoading ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading document…
          </Typography>
        </Stack>
      ) : file.error ? (
        <Alert severity="error">{file.error}</Alert>
      ) : (
        <img src={file.objectUrl} alt={fileName} style={{ maxWidth: "100%" }} />
      )}
    </DueDiligenceShell>
  );
}
