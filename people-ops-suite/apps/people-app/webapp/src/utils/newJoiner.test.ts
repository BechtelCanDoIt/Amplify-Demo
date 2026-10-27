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

import { EmployeeStatus, isCurrentEmployeeStatusSet } from "@/types/types";

import { isPlaceholderWorkEmail } from "./utils";

describe("isPlaceholderWorkEmail", () => {
  it("recognises both placeholders, ignoring case and surrounding space", () => {
    expect(isPlaceholderWorkEmail("future-joiner@wso2.com")).toBe(true);
    expect(isPlaceholderWorkEmail(" Ex-Employee@WSO2.com ")).toBe(true);
  });

  it("treats a person's own address as real", () => {
    expect(isPlaceholderWorkEmail("john@wso2.com")).toBe(false);
    expect(isPlaceholderWorkEmail("future-joiner2@wso2.com")).toBe(false);
    expect(isPlaceholderWorkEmail("")).toBe(false);
  });
});

describe("isCurrentEmployeeStatusSet", () => {
  it("matches the default scope in any order", () => {
    expect(
      isCurrentEmployeeStatusSet([
        EmployeeStatus.NewJoiner,
        EmployeeStatus.Active,
        EmployeeStatus.MarkedLeaver,
      ]),
    ).toBe(true);
  });

  it("does not match the old Active + Marked leaver pair or a wider set", () => {
    expect(
      isCurrentEmployeeStatusSet([EmployeeStatus.Active, EmployeeStatus.MarkedLeaver]),
    ).toBe(false);
    expect(
      isCurrentEmployeeStatusSet([
        EmployeeStatus.Active,
        EmployeeStatus.MarkedLeaver,
        EmployeeStatus.NewJoiner,
        EmployeeStatus.Left,
      ]),
    ).toBe(false);
  });
});
