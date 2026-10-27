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

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@wso2/oxygen-ui";
import type { CreditScoreRatio } from "@features/due-diligence/preferences/api/usePreferences";
import {
  calculateCreditRating,
  calculateCurrentAssetYoY,
  calculateCurrentLiabilityYoY,
  calculateFinalCreditRating,
  calculateFinalTotalCreditScore,
  calculateTotalCreditScore,
  convertToDollars,
  calculateCurrentRatio,
  calculateCashRatio,
  calculateWorkingCapitalRatio,
  calculateDebtRatio,
  getRevenue,
  getProfit,
  calculateRevenueGrowth,
  getFinancialCreditScore,
  getRatio,
  type YearData,
} from "./creditScoreMath";

const withCommas = (n: number | string): string => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Ported from the source app's Resellers/ResellerDashboard/CreditScore/CreditScoreChecking.js
 * — a read-only display of the computed ratios, per-year credit scores, and
 * the final financial credit score/rating. All the math lives in
 * creditScoreMath.ts; this component only formats it.
 */
export default function CreditScoreChecking({
  year1,
  year2,
  year3,
  ratios,
  currency,
}: {
  year1: YearData;
  year2: YearData;
  year3: YearData;
  ratios: CreditScoreRatio[];
  currency: string;
}) {
  // Every calculation runs on DOLLAR-CONVERTED figures, not the raw
  // currency-of-record ones — matches the source's own data flow (it
  // converts on load, before any ratio is computed).
  const usd = currency === "US Dollar";
  const years: Record<1 | 2 | 3, YearData> = {
    1: convertToDollars(usd ? { ...year1, exchangeRate: 1 } : year1),
    2: convertToDollars(usd ? { ...year2, exchangeRate: 1 } : year2),
    3: convertToDollars(usd ? { ...year3, exchangeRate: 1 } : year3),
  };

  // An outline in a semantic palette color rather than a filled background —
  // sidesteps needing a hand-tuned literal color per theme entirely, since
  // `success.main`/`error.main` are already theme-aware, and it never
  // requires overriding the cell's own (theme-correct) text color either.
  const rateCellStyle = (curr: number | string, prev: number | string, worseWhenLower: boolean) => {
    if (typeof curr !== "number" || typeof prev !== "number") return undefined;
    const worse = worseWhenLower ? curr < prev : curr > prev;
    return { border: "2px solid", borderColor: worse ? "error.main" : "success.main" };
  };

  return (
    <TableContainer sx={{ border: 1, borderColor: "divider" }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: "background.default" }}>
          <TableRow>
            <TableCell align="center" rowSpan={2} sx={{ minWidth: 240 }}>
              Ratios
            </TableCell>
            <TableCell align="center" colSpan={3}>
              Customer Financials
            </TableCell>
            <TableCell align="center" colSpan={3}>
              Credit Score
            </TableCell>
            <TableCell align="left" rowSpan={2} sx={{ minWidth: 150 }}>
              Financial Credit Score
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontSize: "0.75rem", minWidth: 100 }}>Year Before (N-2)</TableCell>
            <TableCell sx={{ fontSize: "0.75rem", minWidth: 100 }}>Prior Year (N-1)</TableCell>
            <TableCell sx={{ fontSize: "0.75rem", minWidth: 100 }}>Current (N)</TableCell>
            <TableCell sx={{ fontSize: "0.75rem", minWidth: 100 }}>Year Before (N-2)</TableCell>
            <TableCell sx={{ fontSize: "0.75rem", minWidth: 100 }}>Prior Year (N-1)</TableCell>
            <TableCell sx={{ fontSize: "0.75rem", minWidth: 100 }}>Current (N)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Current ratio = Current Assets / Current Liability</TableCell>
            <TableCell>{withCommas(calculateCurrentRatio(years, 1))}</TableCell>
            <TableCell>{withCommas(calculateCurrentRatio(years, 2))}</TableCell>
            <TableCell>{withCommas(calculateCurrentRatio(years, 3))}</TableCell>
            <TableCell>{getRatio(ratios, years, "Current ratio", 1)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Current ratio", 2)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Current ratio", 3)}</TableCell>
            <TableCell>{getFinancialCreditScore(ratios, years, "Current ratio")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Cash ratio = (Cash + Investments) / Current Liability</TableCell>
            <TableCell>{withCommas(calculateCashRatio(years, 1))}</TableCell>
            <TableCell>{withCommas(calculateCashRatio(years, 2))}</TableCell>
            <TableCell>{withCommas(calculateCashRatio(years, 3))}</TableCell>
            <TableCell>{getRatio(ratios, years, "Cash ratio", 1)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Cash ratio", 2)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Cash ratio", 3)}</TableCell>
            <TableCell>{getFinancialCreditScore(ratios, years, "Cash ratio")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Working capital ratio = Current assets - Current liability</TableCell>
            <TableCell>{withCommas(calculateWorkingCapitalRatio(years, 1))}</TableCell>
            <TableCell>{withCommas(calculateWorkingCapitalRatio(years, 2))}</TableCell>
            <TableCell>{withCommas(calculateWorkingCapitalRatio(years, 3))}</TableCell>
            <TableCell>{getRatio(ratios, years, "WC", 1)}</TableCell>
            <TableCell>{getRatio(ratios, years, "WC", 2)}</TableCell>
            <TableCell>{getRatio(ratios, years, "WC", 3)}</TableCell>
            <TableCell>{getFinancialCreditScore(ratios, years, "WC")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Debt ratio = Total debt / Total assets</TableCell>
            <TableCell>{withCommas(calculateDebtRatio(years, 1))}</TableCell>
            <TableCell>{withCommas(calculateDebtRatio(years, 2))}</TableCell>
            <TableCell>{withCommas(calculateDebtRatio(years, 3))}</TableCell>
            <TableCell>{getRatio(ratios, years, "Debt ratio", 1)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Debt ratio", 2)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Debt ratio", 3)}</TableCell>
            <TableCell>{getFinancialCreditScore(ratios, years, "Debt ratio")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Revenue</TableCell>
            <TableCell>{withCommas(getRevenue(years, 1))}</TableCell>
            <TableCell>{withCommas(getRevenue(years, 2))}</TableCell>
            <TableCell>{withCommas(getRevenue(years, 3))}</TableCell>
            <TableCell>{getRatio(ratios, years, "Revenue", 1)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Revenue", 2)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Revenue", 3)}</TableCell>
            <TableCell>{getFinancialCreditScore(ratios, years, "Revenue")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Revenue growth %</TableCell>
            <TableCell>{years[1].revenue ? "0.00%" : ""}</TableCell>
            <TableCell>{withCommas(calculateRevenueGrowth(years, 2))}%</TableCell>
            <TableCell>{withCommas(calculateRevenueGrowth(years, 3))}%</TableCell>
            <TableCell>0</TableCell>
            <TableCell>{getRatio(ratios, years, "Revenue growth", 2)}</TableCell>
            <TableCell>{getRatio(ratios, years, "Revenue growth", 3)}</TableCell>
            <TableCell>{getFinancialCreditScore(ratios, years, "Revenue growth")}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Profit</TableCell>
            <TableCell>{withCommas(getProfit(years, 1))}</TableCell>
            <TableCell>{withCommas(getProfit(years, 2))}</TableCell>
            <TableCell>{withCommas(getProfit(years, 3))}</TableCell>
            <TableCell colSpan={4} />
          </TableRow>
          <TableRow>
            <TableCell>Current asset YoY %</TableCell>
            <TableCell />
            <TableCell>{withCommas(calculateCurrentAssetYoY(years, 2))}%</TableCell>
            <TableCell>{withCommas(calculateCurrentAssetYoY(years, 3))}%</TableCell>
            <TableCell colSpan={4} />
          </TableRow>
          <TableRow>
            <TableCell>Current liability YoY %</TableCell>
            <TableCell />
            <TableCell>{withCommas(calculateCurrentLiabilityYoY(years, 2))}%</TableCell>
            <TableCell>{withCommas(calculateCurrentLiabilityYoY(years, 3))}%</TableCell>
            <TableCell colSpan={4} />
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Total Credit Score</TableCell>
            <TableCell colSpan={3} />
            <TableCell sx={{ fontWeight: 600 }}>{calculateTotalCreditScore(ratios, years, 1)}</TableCell>
            <TableCell sx={{ fontWeight: 600, ...rateCellStyle(calculateTotalCreditScore(ratios, years, 2), calculateTotalCreditScore(ratios, years, 1), true) }}>
              {calculateTotalCreditScore(ratios, years, 2)}
            </TableCell>
            <TableCell sx={{ fontWeight: 600, ...rateCellStyle(calculateTotalCreditScore(ratios, years, 3), calculateTotalCreditScore(ratios, years, 2), true) }}>
              {calculateTotalCreditScore(ratios, years, 3)}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>{calculateFinalTotalCreditScore(ratios, years)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Credit Rating</TableCell>
            <TableCell colSpan={3} />
            <TableCell sx={{ fontWeight: 600 }}>{calculateCreditRating(ratios, years, 1)}</TableCell>
            <TableCell sx={{ fontWeight: 600, ...rateCellStyle(Number(calculateCreditRating(ratios, years, 2)), Number(calculateCreditRating(ratios, years, 1)), false) }}>
              {calculateCreditRating(ratios, years, 2)}
            </TableCell>
            <TableCell sx={{ fontWeight: 600, ...rateCellStyle(Number(calculateCreditRating(ratios, years, 3)), Number(calculateCreditRating(ratios, years, 2)), false) }}>
              {calculateCreditRating(ratios, years, 3)}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }}>{calculateFinalCreditRating(ratios, years)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
