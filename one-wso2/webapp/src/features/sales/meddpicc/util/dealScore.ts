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

// The deal score is Salesforce's own (its deal-health meter); Echo only reads it and
// names its band the way that meter does: Weak 0-49, Moderate 50-69, Strong 70+.

export type ScoreBand = "Weak" | "Moderate" | "Strong";

/**
 * The score as it is shown: rounded to one decimal. The band is read from this too, so a
 * 49.96 shows as 50 and is Moderate, never "50.0, Weak".
 */
export function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}

export function scoreBand(score: number): ScoreBand {
  const shown = roundScore(score);
  if (shown >= 70) return "Strong";
  if (shown >= 50) return "Moderate";
  return "Weak";
}

/** The palette colour a band is drawn in. */
export function bandColor(band: ScoreBand): "error" | "warning" | "success" {
  return band === "Strong" ? "success" : band === "Moderate" ? "warning" : "error";
}

/** One decimal, as Salesforce shows it: 28.3, 70.0 → 70. */
export function formatScore(score: number): string {
  const shown = roundScore(score);
  return Number.isInteger(shown) ? String(shown) : shown.toFixed(1);
}
