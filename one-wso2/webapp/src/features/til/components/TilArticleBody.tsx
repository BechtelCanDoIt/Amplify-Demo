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
import { Box } from "@wso2/oxygen-ui";
import { tilDisplayHtml } from "../util/tilRichText";
import { TIL_SERIF } from "./TilArticleLayout";

// An entry's `what` set for reading: the same sanitized HTML TilWhatContent
// shows inside One WSO2, at article size in the reading face. The first
// paragraph runs a little larger as the lead. Reads --til-accent from
// TilArticleLayout for list markers and links.
export default function TilArticleBody({ html }: { html: string }) {
  return (
    <Box
      sx={{
        fontFamily: TIL_SERIF,
        fontSize: { xs: 17, md: 19.5 },
        lineHeight: 1.68,
        overflowWrap: "break-word",
        "& p": { m: 0, mb: "1em" },
        "& > p:first-of-type": { fontSize: "1.12em", lineHeight: 1.55 },
        "& ul, & ol": { m: 0, mb: "1em", pl: "1.4em" },
        "& ul > li": { listStyleType: "disc" },
        "& ol > li": { listStyleType: "decimal" },
        "& li": { my: "0.3em" },
        "& li::marker": { color: "var(--til-accent)" },
        "& a": { color: "var(--til-accent)", textUnderlineOffset: "3px" },
        "& strong": { fontWeight: 650 },
      }}
      dangerouslySetInnerHTML={{ __html: tilDisplayHtml(html) }}
    />
  );
}
