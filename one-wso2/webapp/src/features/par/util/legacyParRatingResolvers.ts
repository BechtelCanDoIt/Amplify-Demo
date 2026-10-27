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

// overallRating/overallSpecialRating are always null on the migrated
// legacy rows (the old PeopleHR system never populated them) -- every era
// resolves a display rating from the raw managerScoreCode instead, each
// using its OWN era's (and often its own quarter's) scale. A single
// generic 4-code scale is only actually correct for whichever cycles
// happen to coincidentally match it.
import type { ParLegacyQuestionAnswer } from "../api/types";

const TOP_FIVE_PERCENT = "TOP5P";
const TOP_TWENTY_PERCENT = "TOP20P";

export interface LegacyRatingResult {
  rating: string | null;
  special: string | null;
}

// ---- 2015 -- employee's own score, shown on the Employee PAR panel ------

const EMPLOYEE_2015_LABELS: Record<number, string> = {
  0: "Not Completed",
  2: "BELOW EXPECTATIONS",
  3: "MEETS EXPECTATIONS",
  4: "EXCEEDS EXPECTATIONS",
  5: "EXCEPTIONAL",
};

export const resolveLegacy2015EmployeeRatingLabel = (employeeScoreCode: number | null): string | null =>
  employeeScoreCode === null ? null : EMPLOYEE_2015_LABELS[employeeScoreCode] ?? null;

// ---- 2016 Quarterly Review -- each of the 4 variants has its own scale --
// Q2 and Q3/Q4 are NOT identical (Q3/Q4 has no code 1 "N/A" at all), and
// the two Senior Leadership variants rate ONLY the overall cycle score, on
// their own much narrower scales, with no performance questions at all.

const LABELS_2016_Q2: Record<number, string> = {
  0: "Not Completed",
  1: "N/A",
  2: "HR Review",
  3: "Needs improvement",
  4: "Successful",
  5: "Exceptional",
};
const LABELS_2016_Q3Q4: Record<number, string> = {
  0: "Not Completed",
  2: "HR Review",
  3: "Needs improvement",
  4: "Successful",
  5: "Exceptional",
};
const LABELS_2016_SENIOR_Q2: Record<number, string> = {
  4: "Successful",
  5: "Exceptional",
};
const LABELS_2016_SENIOR_Q3Q4: Record<number, string> = {
  5: "Exceptional",
};
const LABELS_2016_BY_CYCLE: Record<string, Record<number, string>> = {
  "2016 Quarterly Review - Q2": LABELS_2016_Q2,
  "2016 Quarterly Review - Q3/Q4": LABELS_2016_Q3Q4,
  "2016 Quarterly Review Senior Leadership - Q2": LABELS_2016_SENIOR_Q2,
  "2016 Quarterly Review Senior Leadership - Q3/Q4": LABELS_2016_SENIOR_Q3Q4,
};

// ---- 2017 Quarterly Review -- each quarter has its own scale ------------

const LABELS_2017: Record<string, Record<number, string>> = {
  "2017 Quarterly Review - Q1": {
    1: "Exceptional",
    2: "HR Review",
    3: "Leave",
    5: "Needs Improvement",
    6: "No Pay Leave",
    7: "Successful",
  },
  "2017 Quarterly Review - Q2": {
    0: "Not Completed",
    1: "Exceptional",
    2: "HR Review",
    3: "Leave",
    4: "N/A (to be selected by all team members)",
    5: "Needs Improvement",
    7: "Successful",
  },
  "2017 Quarterly Review - Q3": { 0: "Not Completed", 1: "N/A", 2: "No Pay Leave", 3: "Score" },
  "2017 Quarterly Review - Q4": { 0: "Not Completed", 1: "N/A", 2: "No Pay Leave", 3: "Score" },
};

// ---- 2018 Performance Evaluation -- each quarter has its own scale ------

const Q1_2018: Record<number, string> = {
  0: "Not Completed",
  1: "Exceptional",
  2: "Successful",
  3: "Needs Improvement",
  4: "Leave",
  6: "N/A",
};
const LABELS_2018: Record<string, Record<number, string>> = {
  "2018 Performance Evaluation - Q1": Q1_2018,
  "2018 Performance Evaluation - Q2": {
    0: "Not Completed",
    1: "Exceptional",
    2: "Successful",
    3: "Needs Improvements",
    4: "Leave",
    5: "No Pay Leave",
  },
  "2018 Performance Evaluation - Q3": {
    0: "Not Completed",
    1: "Exceptional",
    2: "Successful",
    3: "Needs Improvement",
    4: "Leave",
    6: "N/A",
  },
  "2018 Performance Evaluation - Q4": Q1_2018,
};

// ---- 2019 Performance Evaluation -- Q1-Q3 share a scale, Q4 differs -----

const Q1_2019: Record<number, string> = {
  0: "Not Completed",
  1: "Exceptional",
  2: "Successful",
  3: "Needs Improvement",
  4: "Leave",
  6: "N/A",
};
// Q2/Q3/Q4 confirmed as their own shared, narrower scale -- same codes as
// Q1 except no 0 ("Not Completed").
const Q2_Q3_Q4_2019: Record<number, string> = {
  1: "Exceptional",
  2: "Successful",
  3: "Needs Improvement",
  4: "Leave",
  6: "N/A",
};
const LABELS_2019: Record<string, Record<number, string>> = {
  "2019 Performance Evaluation - Q1": Q1_2019,
  "2019 Performance Evaluation - Q2": Q2_Q3_Q4_2019,
  "2019 Performance Evaluation - Q3": Q2_Q3_Q4_2019,
  "2019 Performance Evaluation - Q4": Q2_Q3_Q4_2019,
};

// ---- 2020 Performance Evaluation -- H1/H2 share almost the same scale ---

// H1/H2 confirmed as the same scale -- no code 6 "Leave" on either.
const LABELS_2020_SHARED: Record<number, string> = {
  0: "Not Completed",
  1: "Exceptional",
  2: "Exceeds Expectations",
  3: "Successful",
  4: "Needs Improvement",
  5: "No Rating",
  7: "N/A",
};
const LABELS_2020: Record<string, Record<number, string>> = {
  "2020 Performance Evaluation - H1": LABELS_2020_SHARED,
  "2020 Performance Evaluation - H2": LABELS_2020_SHARED,
};

// ---- 2021 -- Top 5%/20% starts; H1 and H2 capture it differently --------

const LABELS_2021_H1: Record<number, string> = {
  0: "Not Completed",
  1: "Successful",
  2: "Needs Improvement",
  3: "No Rating",
  4: "Leave",
  5: "N/A",
};
const LABELS_2021_H2: Record<number, string> = {
  0: "Not Completed",
  1: "Successful - Top 5%",
  2: "Successful - Top 20%",
  3: "Successful",
  4: "Needs Improvement",
  6: "Leave",
};
const TOP_5_OR_20_QUESTION_LABEL = "Is the employees in the top 5% or top 20% in the team?";
// A lead can type this free-text answer in any of several equivalent
// forms -- "5", "5%", "top 5", "top 5%", "top5", "top5%" (and the 20%
// equivalents) -- explicit local request: catch all of them, not just the
// "top"-prefixed or "%"-suffixed ones.
const TOP_5_PATTERN = /top\s*5\b/i;
const TOP_20_PATTERN = /top\s*20\b/i;
// A bare number only counts when it's the WHOLE answer (optionally with a
// trailing %) -- an unanchored \b5\b/\b20\b also matched "5 years" or "Top
// 20% (5 people in team)" as a Top 5% answer, since it's tested first.
const BARE_5_PATTERN = /^5\s*%?$/;
const BARE_20_PATTERN = /^20\s*%?$/;
const normalizeLabel = (text: string | null | undefined): string => (text ?? "").trim().replace(/\s+/g, " ");

function parseSpecialFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (TOP_5_PATTERN.test(trimmed) || BARE_5_PATTERN.test(trimmed)) return TOP_FIVE_PERCENT;
  if (TOP_20_PATTERN.test(trimmed) || BARE_20_PATTERN.test(trimmed)) return TOP_TWENTY_PERCENT;
  return trimmed && trimmed !== "N/A" ? trimmed : null;
}

function splitTopLabel(label: string | null): LegacyRatingResult {
  if (label === "Successful - Top 5%") return { rating: "Successful", special: TOP_FIVE_PERCENT };
  if (label === "Successful - Top 20%") return { rating: "Successful", special: TOP_TWENTY_PERCENT };
  return { rating: label, special: null };
}

// ---- 2022-2024 -- same Top 5%/20%-in-label mechanism as 2021 H2 ---------

const LABELS_2022: Record<number, string> = {
  0: "Not Completed",
  1: "Successful - Top 5%",
  2: "Successful - Top 20%",
  3: "Successful",
  4: "Needs Improvement",
  5: "No Rating",
  6: "Leave",
  7: "N/A",
};
const LABELS_2023_2024: Record<number, string> = {
  0: "Not Completed",
  1: "Successful - Top 5%",
  2: "Successful - Top 20%",
  3: "Successful",
  4: "Needs Improvement",
  5: "HR Review",
  6: "Leave",
  7: "N/A",
  8: "No Rating",
};

// One dispatcher covering every era (2016-2024 -- 2015 is handled
// separately above, it's the employee's own score, not the manager's).
// Falls through to {rating: null, special: null} for an uncatalogued
// cycle name, so the caller's own record.overallRating/overallSpecialRating
// (always null in practice, but the documented fallback) takes over.
export function resolveLegacyRating(
  cycleName: string,
  managerScoreCode: number | null,
  questionAnswers: ParLegacyQuestionAnswer[],
): LegacyRatingResult {
  if (managerScoreCode === null) {
    return { rating: null, special: null };
  }

  if (cycleName in LABELS_2016_BY_CYCLE) {
    return { rating: LABELS_2016_BY_CYCLE[cycleName][managerScoreCode] ?? null, special: null };
  }
  if (cycleName.startsWith("2017 Quarterly Review")) {
    return { rating: LABELS_2017[cycleName]?.[managerScoreCode] ?? null, special: null };
  }
  if (cycleName.startsWith("2018 Performance Evaluation")) {
    return { rating: LABELS_2018[cycleName]?.[managerScoreCode] ?? null, special: null };
  }
  if (cycleName.trim().startsWith("2019") && cycleName.includes("Performance Evaluation")) {
    return { rating: LABELS_2019[cycleName]?.[managerScoreCode] ?? null, special: null };
  }
  if (cycleName.startsWith("2020 Performance Evaluation")) {
    return { rating: LABELS_2020[cycleName]?.[managerScoreCode] ?? null, special: null };
  }
  if (cycleName === "2021 Performance Evaluation - H1") {
    const rating = LABELS_2021_H1[managerScoreCode] ?? null;
    const topAnswer = questionAnswers.find((qa) => normalizeLabel(qa.title) === normalizeLabel(TOP_5_OR_20_QUESTION_LABEL));
    return { rating, special: parseSpecialFromText(topAnswer?.managerFeedback) };
  }
  if (cycleName === "2021 Performance Evaluation - H2") {
    return splitTopLabel(LABELS_2021_H2[managerScoreCode] ?? null);
  }
  if (cycleName.startsWith("2022 Performance Evaluation")) {
    return splitTopLabel(LABELS_2022[managerScoreCode] ?? null);
  }
  if (cycleName.startsWith("2023 Performance Evaluation") || cycleName.startsWith("2024 Performance Evaluation")) {
    return splitTopLabel(LABELS_2023_2024[managerScoreCode] ?? null);
  }
  return { rating: null, special: null };
}
