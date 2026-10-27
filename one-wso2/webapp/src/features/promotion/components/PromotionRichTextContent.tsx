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

// Ports promotion-app's own RichTextContent.tsx — read-only rendering of a
// decoded recommendation statement/comment/decline reason. `content` must
// already be decoded+sanitized (decodePromotionText does both), matching
// source's own call sites, which always decode before handing this
// component the string.
export default function PromotionRichTextContent({ content }: { content: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        "& ul, & ol": { pl: "2em", my: "0.5em" },
        "& ul > li": { listStyleType: "disc" },
        "& ol > li": { listStyleType: "decimal" },
        "& p": { my: "0.5em" },
      }}
      dangerouslySetInnerHTML={{ __html: content || "N/A" }}
    />
  );
}
