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
import type { ReactNode } from "react";
import { Alert, Box, Typography } from "@wso2/oxygen-ui";

// Page frame for the cafeteria screen: title, subtitle, and the one place the
// "backend not connected" state is rendered.
//
// A screen names itself ONCE, in its title. A parent chip above it earns its
// place only when the title alone would not identify the screen — "Dashboard",
// "History", "Settings" mean nothing without the app they belong to, while
// "Cafeteria" and "Claims" already are the app.
//
// The title itself always stays: the rail is collapsible, and collapsing sets
// every label to `opacity: 0; width: 0`, so with it collapsed the page title is
// the only text naming where you are.
//
// So no eyebrow here. Cafeteria is a one-screen app whose title IS the app
// name — a chip above it read "Menu / Cafeteria", which named the same thing
// twice and disagreed with itself while doing it.
export default function MenuShell({
  title,
  subtitle,
  configured,
  configKey,
  children,
}: {
  title: string;
  subtitle?: string;
  configured: boolean;
  configKey: string;
  children: ReactNode;
}) {
  return (
    <Box>
      {/* An h1, not a styled div: this is the page's heading, and a
          screen-reader user navigating by headings needs it. */}
      <Typography component="h1" variant="h5" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, maxWidth: "70ch" }}>
          {subtitle}
        </Typography>
      )}

      {configured ? (
        children
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          This app isn&apos;t connected yet. Set <code>{configKey}</code> in{" "}
          <code>public/config.js</code> (the backend URL) and reload.
        </Alert>
      )}
    </Box>
  );
}
