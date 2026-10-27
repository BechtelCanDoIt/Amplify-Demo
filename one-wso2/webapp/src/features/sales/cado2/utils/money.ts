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

/**
 * Adds decimal strings exactly, in cents ("0.10" + "0.20" = "0.30"). The
 * inputs are amounts the backend already rounded to at most 2 decimals.
 */
export function sumMoney(values: readonly string[]): string {
  let cents = 0n;
  for (const v of values) {
    const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(v.trim());
    if (!m) throw new Error(`not a money amount: ${v}`);
    const c = BigInt(m[2]) * 100n + BigInt((m[3] ?? "").padEnd(2, "0"));
    cents += m[1] ? -c : c;
  }
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

/**
 * Formats a decimal string with thousands separators, keeping its decimals
 * exactly ("41000.00" → "41,000.00"). Money arrives as strings, so it is never
 * turned into a floating-point number here.
 */
export function formatMoney(value: string | null | undefined): string {
  if (!value) return "—";
  const [whole, frac] = value.split(".");
  const sign = whole.startsWith("-") ? "-" : "";
  const digits = whole.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${digits}${frac !== undefined ? `.${frac}` : ""}`;
}
