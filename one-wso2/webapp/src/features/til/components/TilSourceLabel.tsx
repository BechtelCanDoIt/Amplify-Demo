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
import { Typography } from "@wso2/oxygen-ui";
import type { TilSubmission } from "../api/tilTypes";
import { tilSourceColors } from "../util/tilSourceTones";

// Where a learning came from ("Customer · Acme Bank"), as the small coloured
// label above an entry's title in the thumbnail layouts.
export default function TilSourceLabel({ submission }: { submission: TilSubmission }) {
  return (
    <Typography
      component="span"
      noWrap
      sx={[
        { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", lineHeight: 1.6 },
        tilSourceColors(submission.where, false),
      ]}
    >
      {submission.whereDetail ? `${submission.where} · ${submission.whereDetail}` : submission.where}
    </Typography>
  );
}
