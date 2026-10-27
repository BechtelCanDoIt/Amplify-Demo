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

import { describe, expect, it } from "vitest";
import { resolveLegacy2015EmployeeRatingLabel, resolveLegacyRating } from "./legacyParRatingResolvers";
import type { ParLegacyQuestionAnswer } from "../api/types";

function topQuestion(answer: string | null): ParLegacyQuestionAnswer[] {
  return [
    {
      title: "Is the employees in the top 5% or top 20% in the team?",
      employeeAnswer: null,
      managerFeedback: answer,
    },
  ];
}

describe("resolveLegacy2015EmployeeRatingLabel", () => {
  it("resolves every known 2015 employee code", () => {
    expect(resolveLegacy2015EmployeeRatingLabel(0)).toBe("Not Completed");
    expect(resolveLegacy2015EmployeeRatingLabel(2)).toBe("BELOW EXPECTATIONS");
    expect(resolveLegacy2015EmployeeRatingLabel(3)).toBe("MEETS EXPECTATIONS");
    expect(resolveLegacy2015EmployeeRatingLabel(4)).toBe("EXCEEDS EXPECTATIONS");
    expect(resolveLegacy2015EmployeeRatingLabel(5)).toBe("EXCEPTIONAL");
  });

  it("has no label for code 1 -- that code was never used in the 2015 scale", () => {
    expect(resolveLegacy2015EmployeeRatingLabel(1)).toBeNull();
  });

  it("returns null for a null code", () => {
    expect(resolveLegacy2015EmployeeRatingLabel(null)).toBeNull();
  });
});

describe("resolveLegacyRating -- one known code per era", () => {
  it.each([
    ["2016 Quarterly Review - Q2", 4, "Successful"],
    ["2016 Quarterly Review - Q3/Q4", 5, "Exceptional"],
    ["2017 Quarterly Review - Q1", 7, "Successful"],
    ["2017 Quarterly Review - Q3", 3, "Score"],
    ["2018 Performance Evaluation - Q1", 2, "Successful"],
    ["2018 Performance Evaluation - Q2", 3, "Needs Improvements"],
    ["2019 Performance Evaluation - Q1", 2, "Successful"],
    // Real migrated data has been seen with a double space here --
    // resolveLegacyRating expects it already normalized by
    // formatLegacyCycleName (as every real call site does), not raw.
    ["2019 Performance Evaluation - Q2", 6, "N/A"],
    ["2020 Performance Evaluation - H1", 2, "Exceeds Expectations"],
    ["2021 Performance Evaluation - H2", 3, "Successful"],
    ["2022 Performance Evaluation - H1", 3, "Successful"],
    ["2023 Performance Evaluation - H1", 8, "No Rating"],
    ["2024 Performance Evaluation - H1", 4, "Needs Improvement"],
  ])("%s, code %i -> %s", (cycleName, code, expectedRating) => {
    expect(resolveLegacyRating(cycleName, code, []).rating).toBe(expectedRating);
  });

  it("returns null for an uncatalogued cycle name", () => {
    expect(resolveLegacyRating("2025 Performance Evaluation - H1", 3, [])).toEqual({ rating: null, special: null });
  });

  it("returns null for a null manager code", () => {
    expect(resolveLegacyRating("2022 Performance Evaluation - H1", null, [])).toEqual({
      rating: null,
      special: null,
    });
  });
});

describe("resolveLegacyRating -- Top 5%/20% special rating", () => {
  it("splits 'Successful - Top 5%' into rating + special for 2021 H2 onward", () => {
    expect(resolveLegacyRating("2021 Performance Evaluation - H2", 1, [])).toEqual({
      rating: "Successful",
      special: "TOP5P",
    });
    expect(resolveLegacyRating("2022 Performance Evaluation - H1", 2, [])).toEqual({
      rating: "Successful",
      special: "TOP20P",
    });
  });

  it("2021 H1 reads the special rating from the free-text question answer, not the score code", () => {
    expect(resolveLegacyRating("2021 Performance Evaluation - H1", 1, topQuestion("Top 5%")).special).toBe("TOP5P");
    expect(resolveLegacyRating("2021 Performance Evaluation - H1", 1, topQuestion("top20")).special).toBe("TOP20P");
  });

  it("only treats a bare number as Top 5%/20% when it's the WHOLE answer, not embedded in other text", () => {
    // "5 years" isn't a Top 5%/20% answer at all -- it falls through to the
    // literal-text passthrough (not TOP5P, not TOP20P, not null).
    const notTop = resolveLegacyRating("2021 Performance Evaluation - H1", 1, topQuestion("5 years")).special;
    expect(notTop).not.toBe("TOP5P");
    expect(notTop).not.toBe("TOP20P");
    expect(resolveLegacyRating("2021 Performance Evaluation - H1", 1, topQuestion("Top 20% (5 people in team)")).special).toBe(
      "TOP20P",
    );
    expect(resolveLegacyRating("2021 Performance Evaluation - H1", 1, topQuestion("5%")).special).toBe("TOP5P");
    expect(resolveLegacyRating("2021 Performance Evaluation - H1", 1, topQuestion("20")).special).toBe("TOP20P");
  });

  it("has no special rating when the question answer is missing (summary mode)", () => {
    expect(resolveLegacyRating("2021 Performance Evaluation - H1", 1, []).special).toBeNull();
  });
});
