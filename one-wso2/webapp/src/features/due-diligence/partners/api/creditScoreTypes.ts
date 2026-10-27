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

import type { CreditScoreRatio } from "@features/due-diligence/preferences/api/usePreferences";

export interface CreditScoreItem {
  companyId: number;
  year: number;
  currentAssets: number;
  currentLiability: number;
  cash: number;
  investments: number;
  totalDebt: number;
  totalAssets: number;
  revenue: number;
  profit: number;
  exchangeRate: number | null;
}

/** GET .../credit-score-items/{companyId} → `currency` is a CompanyInfo[]; only `descriptionAnswer` on entry 0 is used. */
export interface CreditScoreData {
  items: CreditScoreItem[];
  ratios: CreditScoreRatio[];
  currency: { descriptionAnswer: string }[];
}
