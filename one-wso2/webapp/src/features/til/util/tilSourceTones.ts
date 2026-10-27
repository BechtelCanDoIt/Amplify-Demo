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
import type { Theme } from "@wso2/oxygen-ui";
import type { TilWhere } from "../api/tilTypes";

export interface TilSourceTint {
  /** Fill behind a cover's icon. */
  wash: string;
  /** The cover's icon, and the source label as text on the entry's card. */
  ink: string;
}

export interface TilSourceTone {
  light: TilSourceTint;
  dark: TilSourceTint;
}

// One colour per source (where a learning came from), so the feed's covers and
// source labels can be told apart at a glance. Kept to this feature on purpose:
// config/perspectiveHues is the launcher's palette, and a source isn't a
// perspective. Internal shares Knowledge's crimson since TIL lives there.
//
// The ink does two jobs, so it has to clear the stricter of them: 4.5:1 as
// small text on the card, and 3:1 as an icon on its wash. In light the card is
// white; in dark it's the shell's navy, measured at its lightest (#1E2A3D, the
// radial highlight under the card's own dimming). The dark inks are the hue
// lifted toward white just far enough. tilSourceTones.test.ts recomputes all of it.
export const TIL_SOURCE_TONES: Record<TilWhere, TilSourceTone> = {
  Customer: {
    light: { wash: "#E4EDFA", ink: "#22589F" },
    dark: { wash: "#192C4B", ink: "#5E94DF" },
  },
  Partner: {
    light: { wash: "#DEF0ED", ink: "#0B6B5A" },
    dark: { wash: "#12303B", ink: "#32A38E" },
  },
  Internal: {
    light: { wash: "#FAE6E8", ink: "#9B2736" },
    dark: { wash: "#362335", ink: "#E46F7E" },
  },
  Other: {
    light: { wash: "#F6EFDF", ink: "#7A5708" },
    dark: { wash: "#312E29", ink: "#C08A1E" },
  },
};

/** sx for a source's colours in both schemes: its ink as the text colour and,
 * with `withWash`, its wash as the background. */
export function tilSourceColors(where: TilWhere, withWash: boolean) {
  // A source the backend added after this build falls back to Other's tone.
  const tone = TIL_SOURCE_TONES[where] ?? TIL_SOURCE_TONES.Other;
  return (theme: Theme) => ({
    color: tone.light.ink,
    ...(withWash && { backgroundColor: tone.light.wash }),
    ...theme.applyStyles("dark", {
      color: tone.dark.ink,
      ...(withWash && { backgroundColor: tone.dark.wash }),
    }),
  });
}
