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
import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("takes the first letters of a dotted name", () => {
    expect(initialsOf("jane.doe@wso2.com")).toBe("JD");
  });

  it("takes the first two letters of a single-word name", () => {
    expect(initialsOf("marty@wso2.com")).toBe("MA");
  });

  it("is empty for an empty e-mail", () => {
    expect(initialsOf("")).toBe("");
  });
});
