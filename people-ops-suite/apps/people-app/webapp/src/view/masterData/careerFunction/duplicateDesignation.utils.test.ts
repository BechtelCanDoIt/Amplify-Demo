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

import {
  isDuplicateCareerFunctionName,
  isDuplicateDesignationName,
} from "./duplicateDesignation.utils";
import { CareerFunction, Designation } from "@slices/careerFunctionSlice/careerFunction";

const rows: Designation[] = [
  { id: 1, designation: "Software Engineer", jobBand: 4, careerFunctionId: 10, isActive: true, activeEmployeeCount: 5 },
  { id: 2, designation: "Retired Role", jobBand: null, careerFunctionId: 10, isActive: false, activeEmployeeCount: 0 },
  { id: 3, designation: "Software Engineer", jobBand: 4, careerFunctionId: 20, isActive: true, activeEmployeeCount: 2 },
  { id: 4, designation: "Intern", jobBand: null, careerFunctionId: null, isActive: true, activeEmployeeCount: 1 },
];

describe("isDuplicateDesignationName", () => {
  it("flags an exact active duplicate in the same career function", () => {
    expect(isDuplicateDesignationName("Software Engineer", 10, rows)).toBe(true);
  });

  it("ignores case", () => {
    expect(isDuplicateDesignationName("software engineer", 10, rows)).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isDuplicateDesignationName("  Software Engineer  ", 10, rows)).toBe(true);
  });

  it("allows the same name under a different career function", () => {
    expect(isDuplicateDesignationName("Software Engineer", 30, rows)).toBe(false);
  });

  it("allows reusing the name of an inactive designation", () => {
    expect(isDuplicateDesignationName("Retired Role", 10, rows)).toBe(false);
  });

  it("treats unassigned designations as their own group", () => {
    expect(isDuplicateDesignationName("Intern", null, rows)).toBe(true);
    expect(isDuplicateDesignationName("Intern", 10, rows)).toBe(false);
  });

  it("does not flag the row being edited against itself", () => {
    expect(isDuplicateDesignationName("Software Engineer", 10, rows, 1)).toBe(false);
  });

  it("returns false for an empty name", () => {
    expect(isDuplicateDesignationName("   ", 10, rows)).toBe(false);
  });

  it("still reports a duplicate when the colliding row is active, regardless of the candidate's own state", () => {
    expect(isDuplicateDesignationName("Software Engineer", 10, rows)).toBe(true);
  });
});

const careerFunctions: CareerFunction[] = [
  { id: 10, careerFunction: "Engineering", isActive: true, activeEmployeeCount: 128 },
  { id: 20, careerFunction: "Finance", isActive: true, activeEmployeeCount: 19 },
  { id: 30, careerFunction: "Old Sales Function", isActive: false, activeEmployeeCount: 0 },
];

describe("isDuplicateCareerFunctionName", () => {
  it("flags an exact duplicate", () => {
    expect(isDuplicateCareerFunctionName("Engineering", careerFunctions)).toBe(true);
  });

  it("ignores case", () => {
    expect(isDuplicateCareerFunctionName("engineering", careerFunctions)).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isDuplicateCareerFunctionName("  Engineering  ", careerFunctions)).toBe(true);
  });

  it("allows a name no career function is using", () => {
    expect(isDuplicateCareerFunctionName("Legal", careerFunctions)).toBe(false);
  });

  it("still flags a name held by an INACTIVE career function", () => {
    // Stricter than the designation rule on purpose: a career function name is never
    // reusable, so a retired one keeps holding its name.
    expect(isDuplicateCareerFunctionName("Old Sales Function", careerFunctions)).toBe(true);
  });

  it("does not flag the row being edited against itself", () => {
    expect(isDuplicateCareerFunctionName("Engineering", careerFunctions, 10)).toBe(false);
  });

  it("still flags a collision with a different row while editing", () => {
    expect(isDuplicateCareerFunctionName("Finance", careerFunctions, 10)).toBe(true);
  });

  it("returns false for an empty name", () => {
    expect(isDuplicateCareerFunctionName("   ", careerFunctions)).toBe(false);
  });
});
