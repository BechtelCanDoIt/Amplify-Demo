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

import { salesforceBaseUrl } from "@config/apiConfig";

/** Salesforce objects CadO2 links to. */
export type SalesforceObject = "Account" | "Opportunity" | "Contact";

const ID = /^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/;

/**
 * A link to a Salesforce record's Lightning page, from ONE_WSO2_SALESFORCE_BASE_URL,
 * or null when the id isn't a Salesforce id or the base isn't https.
 */
export function salesforceRecordUrl(object: SalesforceObject, id: string | null | undefined): string | null {
  if (!id || !ID.test(id) || !/^https:\/\//.test(salesforceBaseUrl)) return null;
  return `${salesforceBaseUrl}/lightning/r/${object}/${encodeURIComponent(id)}/view`;
}
