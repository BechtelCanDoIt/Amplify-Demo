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

// Theme-resolved colors for the Budget Sync tab. This app is
// themeable (light/dark), so the semantic colors are resolved from the active
// MUI palette, and tints go through CSS color-mix, which accepts any color
// string (a hex, an rgb() — whatever the theme produces) where a hex alpha
// suffix only works on a 6-digit hex.
//
// Separate from the components for the reason useChartStyles.ts gives: a module
// that exports both components and hooks loses React Fast Refresh.

import { useMemo } from "react";
import { useTheme } from "@wso2/oxygen-ui";

// The pace logic (budgetPacingLogic.ts) deals in these semantic tones, not
// colors, so it stays free of any theme dependency and is unit-testable.
export type Tone = "orange" | "slate" | "red" | "amber" | "green" | "purple";
export type TonePalette = Record<Tone, string>;

export function useTonePalette(): TonePalette {
  const { palette } = useTheme();
  return useMemo(
    () => ({
      orange: palette.primary.main,
      slate: palette.text.secondary,
      red: palette.error.main,
      amber: palette.warning.main,
      green: palette.success.main,
      // "Ahead of pace" / "spending with no budget": a distinct non-alarm hue.
      purple: palette.info.main,
    }),
    [palette],
  );
}

/** `pct`% of `color` over a transparent background — a chip fill or border tint. */
export const tint = (color: string, pct: number): string =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;
