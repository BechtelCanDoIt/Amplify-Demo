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
import type { Theme } from "@mui/material/styles";
import { CHIP_INK, applySx, chipSx, underlineTabSx } from "./misLookTokens";

function theme(): Theme {
  return {
    applyStyles: (mode: string, styles: Record<string, string>) => ({ [`@${mode}`]: styles }),
  } as unknown as Theme;
}

function contrast(foreground: number[], background: number[]) {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (rgb: number[]) =>
    0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("MIS chrome contrast", () => {
  it("paints an applied-filter chip dark enough for its tinted wash", () => {
    // The wash is primary at 12% over the card's #fafafa stop.
    const wash = [255, 115, 0].map((channel) => Math.round(channel * 0.12 + 250 * 0.88));
    const ink = [170, 76, 0];
    expect(CHIP_INK).toBe("#aa4c00");
    expect(chipSx(theme()).color).toBe(CHIP_INK);
    expect(contrast(ink, wash)).toBeGreaterThanOrEqual(4.5);
  });

  it("sets Apply and Export type to black, which the orange gradient can carry", () => {
    const fill = applySx["&&:not(:disabled), &&:hover:not(:disabled)"];
    expect(fill.color).toBe("#000 !important");
    // The two stops of Oxygen's contained-primary gradient.
    expect(contrast([0, 0, 0], [244, 123, 32])).toBeGreaterThanOrEqual(4.5);
    expect(contrast([0, 0, 0], [239, 66, 35])).toBeGreaterThanOrEqual(4.5);
  });

  it("does not fade a resting table tab below the body ink", () => {
    const resting = underlineTabSx(false)(theme()) as unknown as {
      opacity: number;
      "@light": { color: string };
    };
    expect(resting.opacity).toBe(1);
    expect(resting["@light"].color).toBe("#475569");
  });
});
