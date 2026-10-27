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
import { duration, slaLabel } from "./sla";

const now = new Date("2026-10-07T12:00:00Z");
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000).toISOString();

describe("duration", () => {
  it("reads as minutes, hours or days", () => {
    expect(duration(45 * 60_000)).toBe("45 min");
    expect(duration(30_000)).toBe("1 min");
    expect(duration(6.5 * 3_600_000)).toBe("6 h 30 min");
    expect(duration(14.5 * 3_600_000)).toBe("14 h");
    expect(duration(51 * 3_600_000)).toBe("2 d 3 h");
    expect(duration(-6 * 3_600_000)).toBe("6 h");
  });
});

describe("slaLabel", () => {
  it("is red once overdue, amber when at risk", () => {
    expect(slaLabel("BREACHED", inHours(-6), now)).toMatchObject({ label: "Overdue by 6 h", color: "error" });
    expect(slaLabel("AT_RISK", inHours(3), now)).toMatchObject({ label: "Due in 3 h", color: "warning" });
  });

  it("on track: a countdown under a day, a day and time further away", () => {
    expect(slaLabel("ON_TRACK", inHours(20), now)).toMatchObject({ label: "Due in 20 h", color: "default" });
    const later = slaLabel("ON_TRACK", inHours(40), now);
    expect(later.label).toMatch(/^Due (?!in)/);
    expect(later.title).toMatch(/^Due /);
  });
});
