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

import type { OxygenTheme } from "@wso2/oxygen-ui/styles/OxygenThemeBase";
import { pickAccessibleText } from "@utils/contrastText";

/**
 * Accessibility overlay applied on top of whichever Oxygen theme is active.
 *
 * Without it, every text/outlined `color="primary"` control fails WCAG AA in
 * light mode.
 *
 * The accent passes as orange-on-dark, but as *text or border on a light
 * surface* it fails: with the default WSO2 theme, `primary.main` `#FF7300` is
 * 2.73:1 on white — under even the 3:1 non-text floor. Rather than patch each
 * call site, shift only the text/border colour of text & outlined primary
 * controls to `primary.dark`, and only in the light colour scheme via
 * `applyStyles("light", …)`; dark mode is untouched. WSO2Theme declares no
 * `dark`, so MUI derives `#CC5C00` at tonalOffset 0.2 — 4.12:1, which clears
 * the 3:1 non-text floor and large text, but is still short of the 4.5:1
 * small-text floor.
 *
 * What this does NOT fix: white-on-orange in *contained* primary controls,
 * which measures 2.73:1 and fails AA outright for label text. This overlay
 * deliberately leaves it alone, because both remedies change Oxygen's theme
 * rather than this code — near-black labels reach 7.13:1 but look unlike any
 * other WSO2 product, and keeping white labels needs the fill darkened, which
 * abandons the hex Oxygen ships. Since these themes are now used as shipped,
 * that is an upstream Oxygen decision, not one to make here.
 *
 * Kept theme-agnostic — it reads `primary.dark` from whatever theme is active,
 * so it survives a theme swap rather than being a separate named theme.
 *
 * Returns a shallow clone of `base` with the extra style slots merged in,
 * preserving the theme's CSS-variable colour schemes.
 */
export function withA11yOverrides(base: OxygenTheme): OxygenTheme {
  // CSS-vars themes expose `applyStyles(scheme, styles)`, which scopes the
  // given styles to one colour scheme. Typed loosely because the public
  // OxygenTheme type does not surface the CssVars helpers.
  const lightColor = ({
    theme,
  }: {
    theme: {
      applyStyles: (scheme: string, styles: Record<string, unknown>) => unknown;
      palette: { primary: { dark: string } };
    };
  }): Record<string, unknown> => ({
    ...(theme.applyStyles("light", {
      color: theme.palette.primary.dark,
    }) as Record<string, unknown>),
  });

  const lightColorAndBorder = ({
    theme,
  }: {
    theme: {
      applyStyles: (scheme: string, styles: Record<string, unknown>) => unknown;
      palette: { primary: { dark: string } };
    };
  }): Record<string, unknown> => ({
    ...(theme.applyStyles("light", {
      color: theme.palette.primary.dark,
      borderColor: theme.palette.primary.dark,
    }) as Record<string, unknown>),
  });

  // Oxygen's `UserMenu` paints the user-initial avatar (trigger + dropdown
  // header) as white-on-`primary.main`, which fails AA in BOTH modes (the fill
  // is orange in light and dark alike). The avatar is rendered inside the
  // library component, so there is no call site to patch: override the
  // `MuiUserMenu` `avatar`/`headerAvatar` slots and let the initial pick a
  // contrast-safe colour from the resolved fill. Unlike the button fix this is
  // deliberately not mode-scoped.
  const avatarText = ({
    theme,
  }: {
    theme: { palette: { primary: { main: string } } };
  }): Record<string, unknown> => ({
    color: pickAccessibleText(theme.palette.primary.main),
  });

  const baseComponents = (base as { components?: Record<string, unknown> })
    .components;
  const baseButton =
    (baseComponents?.MuiButton as
      | { styleOverrides?: Record<string, unknown> }
      | undefined) ?? {};
  const baseUserMenu =
    (baseComponents?.MuiUserMenu as
      | { styleOverrides?: Record<string, unknown> }
      | undefined) ?? {};
  const baseChip =
    (baseComponents?.MuiChip as
      | { styleOverrides?: Record<string, unknown> }
      | undefined) ?? {};

  return {
    ...base,
    components: {
      ...baseComponents,
      MuiButton: {
        ...baseButton,
        styleOverrides: {
          ...baseButton.styleOverrides,
          textPrimary: lightColor,
          outlinedPrimary: lightColorAndBorder,
        },
      },
      MuiUserMenu: {
        ...baseUserMenu,
        styleOverrides: {
          ...baseUserMenu.styleOverrides,
          avatar: avatarText,
          headerAvatar: avatarText,
        },
      },
      // Outlined `color="primary"` chips paint their label and border with
      // `primary.main` — the same orange-on-light failure as the text/outlined
      // buttons above, fixed the same way.
      MuiChip: {
        ...baseChip,
        styleOverrides: {
          ...baseChip.styleOverrides,
          outlinedPrimary: lightColorAndBorder,
        },
      },
    },
  } as OxygenTheme;
}
