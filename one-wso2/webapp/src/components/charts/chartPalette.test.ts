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
import {
  CHART_FILL_GAP,
  CHART_SERIES_1,
  CHART_SERIES_2,
  chartChrome,
  seriesColor,
} from "./chartPalette";

// Mode selection is the only branch in this module. The hexes themselves are
// the validator's output (see the file header); what a test can lock is which
// half of a slot a theme gets, and that the chrome is not a series colour.

describe("seriesColor", () => {
  it("uses the light half of a slot unless the theme is dark", () => {
    expect(seriesColor(CHART_SERIES_1, "light")).toBe("#2a78d6");
    expect(seriesColor(CHART_SERIES_1, "dark")).toBe("#3987e5");
    expect(seriesColor(CHART_SERIES_2, "light")).toBe("#eb6834");
    expect(seriesColor(CHART_SERIES_2, "dark")).toBe("#d95926");
  });
});

describe("chartChrome", () => {
  it("uses dark ink on a light surface and white ink on a dark one", () => {
    expect(chartChrome("light")).toEqual({
      line: "rgba(15, 23, 42, 0.10)",
      tick: "rgba(15, 23, 42, 0.60)",
    });
    expect(chartChrome("dark")).toEqual({
      line: "rgba(255, 255, 255, 0.10)",
      tick: "rgba(255, 255, 255, 0.62)",
    });
  });

  it("does not paint the ticks in a series colour", () => {
    for (const mode of ["light", "dark"] as const) {
      const { tick } = chartChrome(mode);
      expect(tick).not.toBe(seriesColor(CHART_SERIES_1, mode));
      expect(tick).not.toBe(seriesColor(CHART_SERIES_2, mode));
    }
  });
});

describe("CHART_FILL_GAP", () => {
  it("separates touching fills by two pixels", () => {
    expect(CHART_FILL_GAP).toBe(2);
  });
});
