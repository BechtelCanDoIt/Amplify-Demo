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
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import type { ReactNode } from "react";
import { Box, Link, Typography } from "@wso2/oxygen-ui";
import { Link as RouterLink } from "react-router";
import { perspectiveHue } from "@config/perspectiveHues";
import { TIL_FEED_PATH } from "../util/tilArticleView";
import TilMark from "./TilMark";

/** The article view's reading face, self-hosted (the CSP admits no font CDN). */
export const TIL_SERIF = "'Newsreader Variable', Georgia, 'Times New Roman', serif";

// The frame of an entry read as an article (?view=article): TIL's own
// masthead and footer in place of the One WSO2 shell. It also sets the
// article's two colours as CSS variables, from Knowledge's launcher hue, so
// every part of the page reads the same values in both colour schemes:
// --til-accent for text and rules, --til-wash for tinted fills. No WSO2 logo
// here: its rules need at least 180x72px and monochrome use, which a
// masthead this size can't give it, so TIL's own mark carries the brand.
export default function TilArticleLayout({ shellHref, children }: { shellHref: string; children: ReactNode }) {
  const hue = perspectiveHue("knowledge");
  return (
    <Box
      sx={(theme) => ({
        "--til-accent": hue?.light.fg ?? theme.palette.primary.main,
        "--til-wash": hue?.light.bg ?? theme.palette.action.hover,
        ...theme.applyStyles("dark", {
          "--til-accent": hue?.dark.fg ?? theme.palette.primary.main,
          "--til-wash": hue?.dark.bg ?? theme.palette.action.hover,
        }),
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
      })}
    >
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2.5, md: 7 },
          py: 2.25,
          borderBottom: "2px solid var(--til-accent)",
        }}
      >
        <Box
          component={RouterLink}
          to={TIL_FEED_PATH}
          sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "inherit", textDecoration: "none", minWidth: 0 }}
        >
          <TilMark size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ display: "block", fontFamily: TIL_SERIF, fontSize: 22, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
              Today I Learned
            </Typography>
            <Typography
              component="span"
              sx={{ display: { xs: "none", sm: "block" }, fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "text.secondary" }}
            >
              Learnings shared by WSO2 people
            </Typography>
          </Box>
        </Box>
        <Link component={RouterLink} to={shellHref} sx={{ fontSize: 13, color: "var(--til-accent)", textUnderlineOffset: "3px", flexShrink: 0 }}>
          Open in One WSO2
        </Link>
      </Box>

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      <Box
        component="footer"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 1,
          px: { xs: 2.5, md: 7 },
          py: 2.5,
          borderTop: 1,
          borderColor: "divider",
          fontSize: 12.5,
          color: "text.secondary",
        }}
      >
        <span>Shared inside WSO2 · sign-in required</span>
        <Link component={RouterLink} to={TIL_FEED_PATH} sx={{ color: "var(--til-accent)", textUnderlineOffset: "3px" }}>
          Back to the feed in One WSO2
        </Link>
      </Box>
    </Box>
  );
}
