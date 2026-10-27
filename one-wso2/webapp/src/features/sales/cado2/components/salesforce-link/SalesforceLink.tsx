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
import type { JSX, ReactNode } from "react";
import { Box, Link } from "@wso2/oxygen-ui";
import { ExternalLinkIcon } from "@wso2/oxygen-ui-icons-react";
import { salesforceRecordUrl, type SalesforceObject } from "@features/sales/cado2/utils/salesforceLinks";

/**
 * A value linked to its Salesforce record (opens in a new tab), or the plain
 * value when no Salesforce base URL is configured. Shared since 2026-10-14:
 * the summary panel, the wizard header and the quote page header.
 */
export default function SalesforceLink({
  object,
  id,
  children,
}: {
  readonly object: SalesforceObject;
  readonly id: string | null | undefined;
  readonly children: ReactNode;
}): JSX.Element {
  const url = salesforceRecordUrl(object, id);
  if (!url) return <>{children}</>;
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      color="inherit"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, font: "inherit" }}
    >
      {children}
      <Box component="span" sx={{ display: "inline-flex", color: "primary.main" }}>
        <ExternalLinkIcon size={12} aria-label="(opens Salesforce)" />
      </Box>
    </Link>
  );
}
