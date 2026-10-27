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

import type { JSX, MouseEvent, ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { Box, Link, Stack, Typography } from "@wso2/oxygen-ui";
import { ArrowLeftIcon } from "@wso2/oxygen-ui-icons-react";

interface PageHeaderProps {
  readonly title: ReactNode;
  /** A small line above the title, e.g. a reference number and status. */
  readonly eyebrow?: ReactNode;
  /** An avatar before the title. */
  readonly avatar?: ReactNode;
  /** Status chips etc., beside the title. */
  readonly chips?: ReactNode;
  /** Buttons on the right. */
  readonly actions?: ReactNode;
  /** A "← back" link above the title. */
  readonly back?: { readonly to: string; readonly label: string; readonly onClick?: (e: MouseEvent) => void };
}

/**
 * The app-wide page header: bold title, chips, actions on the right.
 * There is deliberately no subtitle: nothing goes under a screen's title
 * (no counts, no descriptions). See frontend.md, "Page titles".
 */
export default function PageHeader({
  title,
  eyebrow,
  avatar,
  chips,
  actions,
  back,
}: PageHeaderProps): JSX.Element {
  return (
    <Stack spacing={1.5}>
      {back ? (
        <Link
          component={RouterLink}
          to={back.to}
          onClick={back.onClick}
          variant="body2"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, alignSelf: "flex-start" }}
        >
          <ArrowLeftIcon size={14} /> {back.label}
        </Link>
      ) : null}
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
          {avatar}
          <Box sx={{ minWidth: 0 }}>
            {eyebrow ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: "wrap", rowGap: 0.5 }}>
                {eyebrow}
              </Stack>
            ) : null}
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              {chips}
            </Stack>
          </Box>
        </Stack>
        {actions ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{ flexShrink: 0, flexWrap: "wrap", rowGap: 1 }}
          >
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
