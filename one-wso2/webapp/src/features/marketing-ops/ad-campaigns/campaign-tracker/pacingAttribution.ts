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

// Attributes a real ad campaign name to a Budget Sync cell's own
// (tab_label, side, region, bu) vocabulary. These maps match the budget
// connector's owner-to-tab and BU column rules, the source of truth for every
// tab_label/bu Budget Sync ever stores — so this parser's output is safe to bucket real cells against, unlike
// Campaign Tracker's own Register BU tagging (a different, documented-
// incompatible vocabulary). Do not swap the two.
//
// Convention (from real campaign names, e.g. "EU_Integration | Integrator
// Generic | Feb26_BU"): region/BU come from a PREFIX_SUFFIX code before the
// first "|"; "side" (BU vs Regional) comes from a "_BU"/"_Regional" suffix on
// the last "|"-delimited segment. A name that doesn't parse to a recognized
// code attributes to tab:'Unmapped' and is excluded from every tab bucket —
// see computeIntegrity in budgetPacingLogic.ts for how that's surfaced.

const VALID_REGION_CODES = ["NA", "EU", "UK", "APAC", "ANZ", "LATAM", "ME", "Africa", "GLOBAL"];
const VALID_BU_CODES = ["APIM", "Integration", "IAM", "Corporate", "Solutions", "Choreo", "Healthcare", "AI"];

// Real campaign names aren't consistently cased against these lists — e.g.
// "Global_Corporate | ..." (title case) vs. the list's "GLOBAL" — so prefix
// codes are matched case-insensitively, then normalized back to the list's own
// canonical casing (REGION_TO_TAB/BU_TO_TAB below are keyed on THAT casing,
// which is itself inconsistent — 'GLOBAL' but 'Africa' — so this can't just
// uppercase everything).
const REGION_CODE_BY_UPPER: Record<string, string> = Object.fromEntries(
  VALID_REGION_CODES.map((c) => [c.toUpperCase(), c]),
);
const BU_CODE_BY_UPPER: Record<string, string> = Object.fromEntries(
  VALID_BU_CODES.map((c) => [c.toUpperCase(), c]),
);

// BU code -> the budget-side tab_label a BU-side cell would carry.
const BU_TO_TAB: Record<string, string> = {
  APIM: "API",
  Integration: "Integration",
  IAM: "IAM",
  Solutions: "Solutions",
  Healthcare: "Solutions",
  Corporate: "Corporate",
  Choreo: "Integration",
  AI: "AI",
};
// Region code -> the budget-side tab_label a Regional-side cell would carry.
const REGION_TO_TAB: Record<string, string> = {
  ANZ: "APAC",
  APAC: "APAC",
  EU: "EU",
  UK: "UK",
  NA: "NA",
  LATAM: "LATAM",
  ME: "ME",
  Africa: "Africa",
};
// BU code -> its normalized display form (Healthcare rolls up under Solutions).
const BU_NORMALIZED: Record<string, string> = {
  APIM: "APIM",
  Integration: "Integration",
  IAM: "IAM",
  Corporate: "Corporate",
  Solutions: "Solutions",
  Healthcare: "Solutions",
  Choreo: "Choreo",
  AI: "AI",
};

export interface CampaignAttribution {
  side: "BU" | "Regional" | "Unclassified";
  tab: string;
  region: string;
  bu: string;
}

export function attributeCampaignName(name: string | null | undefined): CampaignAttribution {
  const parts = String(name ?? "")
    .split("|")
    .map((s) => s.trim());

  let region = "Unmapped";
  let bu = "Unmapped";
  let side: CampaignAttribution["side"] = "Unclassified";

  const prefix = parts[0];
  if (prefix && prefix.includes("_")) {
    const i = prefix.indexOf("_");
    const a = prefix.slice(0, i).toUpperCase();
    const b = prefix.slice(i + 1).toUpperCase();
    if (REGION_CODE_BY_UPPER[a]) region = REGION_CODE_BY_UPPER[a];
    if (BU_CODE_BY_UPPER[b]) bu = BU_CODE_BY_UPPER[b];
  }

  if (parts.length >= 3) {
    const tail = parts[parts.length - 1].toLowerCase();
    if (tail.endsWith("_regional")) side = "Regional";
    else if (tail.endsWith("_bu")) side = "BU";
  }

  let tab = "Unmapped";
  if (side === "BU") tab = BU_TO_TAB[bu] ?? "Unmapped";
  else if (side === "Regional") tab = REGION_TO_TAB[region] ?? "Unmapped";

  return {
    side,
    tab,
    region: REGION_TO_TAB[region] ?? (region === "GLOBAL" ? "GLOBAL" : "Unmapped"),
    bu: BU_NORMALIZED[bu] ?? "Unmapped",
  };
}
