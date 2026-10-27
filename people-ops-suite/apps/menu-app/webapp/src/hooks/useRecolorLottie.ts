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
import { useMemo } from "react";

/** A map of { [targetHex]: replacementHex } for batch color replacement. */
export type ColorMap = Record<string, string>;

function hexToLottieColor(hex: string): number[] {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
}

function colorsMatch(a: number[], b: number[], tolerance = 0.01): boolean {
  return (
    a.length >= 3 &&
    b.length >= 3 &&
    Math.abs(a[0] - b[0]) < tolerance &&
    Math.abs(a[1] - b[1]) < tolerance &&
    Math.abs(a[2] - b[2]) < tolerance
  );
}

/**
 * Deep-clones a Lottie animation JSON and applies a color map in a single
 * traversal, replacing each matched fill/stroke color with its mapped value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyColorMap(anim: any, colorMap: ColorMap): any {
  const entries = Object.entries(colorMap).map(([target, replacement]) => ({
    target: hexToLottieColor(target),
    replacement: hexToLottieColor(replacement),
  }));

  const data = JSON.parse(JSON.stringify(anim));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (items: any[]) => {
    items.forEach((it) => {
      if ((it.ty === "fl" || it.ty === "st") && Array.isArray(it.c?.k)) {
        const match = entries.find(({ target }) => colorsMatch(it.c.k, target));
        if (match) {
          it.c.k = [...match.replacement, 1];
        }
      }
      if (it.it) walk(it.it);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data.layers || []).forEach((layer: any) => layer.shapes && walk(layer.shapes));
  return data;
}

/**
 * Returns a memoized, recolored copy of the Lottie animation JSON
 * using a color map of `{ [targetHex]: replacementHex }` pairs.
 * All replacements are applied in a single traversal.
 * Re-computes only when the animation data or color map reference changes.
 *
 * @param anim     - The original Lottie animation JSON object
 * @param colorMap - Map of colors to find and their replacements
 * @returns Recolored Lottie animation JSON
 *
 * @example
 * const recolored = useRecolorLottie(anim, {
 *   "#020F30": theme.palette.customText.primary.p1.active,
 *   "#F57800": theme.palette.fill.primary.active,
 * });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRecolorLottie(anim: any, colorMap: ColorMap): any {
  return useMemo(() => applyColorMap(anim, colorMap), [anim, colorMap]);
}

/**
 * Convenience wrapper for replacing a single color.
 *
 * @param anim           - The original Lottie animation JSON object
 * @param targetHex      - The color to replace (e.g. "#020F30" for navy blue)
 * @param replacementHex - The new color to use
 * @returns Recolored Lottie animation JSON
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRecolorLottieSelective(
  anim: any,
  targetHex: string,
  replacementHex: string,
): any {
  const colorMap = useMemo(() => ({ [targetHex]: replacementHex }), [targetHex, replacementHex]);
  return useRecolorLottie(anim, colorMap);
}
