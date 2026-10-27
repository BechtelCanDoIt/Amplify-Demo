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
import { contrastRatio, parseColor } from "@utils/contrastText";
import { TIL_WHERE_OPTIONS } from "../api/tilTypes";
import { TIL_SOURCE_TONES } from "./tilSourceTones";

function contrast(a: string, b: string): number {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) throw new Error(`unparseable colour: ${a} / ${b}`);
  return contrastRatio(x, y);
}

// The card behind a source label: white in light; in dark, the lightest spot
// of the shell's navy (its radial highlight under the card's 15% dimming).
const LIGHT_CARD = "#FFFFFF";
const DARK_CARD_LIGHTEST = "#1E2A3D";

describe("TIL_SOURCE_TONES", () => {
  it("has a tone for every source", () => {
    for (const where of TIL_WHERE_OPTIONS) expect(TIL_SOURCE_TONES[where]).toBeDefined();
  });

  it.each(TIL_WHERE_OPTIONS)("%s reads as text on the card in both schemes (4.5:1)", (where) => {
    const tone = TIL_SOURCE_TONES[where];
    expect(contrast(tone.light.ink, LIGHT_CARD)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.dark.ink, DARK_CARD_LIGHTEST)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TIL_WHERE_OPTIONS)("%s's icon stands out on its cover in both schemes (3:1)", (where) => {
    const tone = TIL_SOURCE_TONES[where];
    expect(contrast(tone.light.ink, tone.light.wash)).toBeGreaterThanOrEqual(3);
    expect(contrast(tone.dark.ink, tone.dark.wash)).toBeGreaterThanOrEqual(3);
  });
});
