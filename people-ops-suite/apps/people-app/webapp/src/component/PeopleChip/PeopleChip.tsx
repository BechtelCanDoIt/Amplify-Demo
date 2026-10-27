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

import { Avatar, Box, Tooltip, Typography, useTheme } from "@mui/material";
import { useEmployeeDirectory, splitEmails } from "./useEmployeeDirectory";

type PeopleChipSize = "sm" | "lg";

interface PeopleChipProps {
  /** Work email of the person to display — the only identifier needed. */
  email: string | null | undefined;
  /** `sm` (default) for inline lists and record rows, `lg` for standalone fields. */
  size?: PeopleChipSize;
  /** Shows the email on hover/focus when a name was resolved. Defaults to true. */
  showTooltip?: boolean;
}

const SIZES = {
  sm: { avatar: 26, font: 13.5, initial: 11.5, padding: "4px 12px 4px 4px" },
  lg: { avatar: 30, font: 15, initial: 13, padding: "5px 14px 5px 5px" },
} as const;

/**
 * Renders a person as an avatar + full name chip, resolved from the cached employee
 * directory by work email.
 *
 * Falls back to rendering the raw email when the address is not in the directory — leads
 * who have left, external leads, or current employees missing org data. That fallback is
 * the pre-existing behaviour, so an unresolved person never renders blank.
 */
export default function PeopleChip({
  email,
  size = "sm",
  showTooltip = true,
}: PeopleChipProps) {
  const theme = useTheme();
  const { lookup } = useEmployeeDirectory();

  if (!email || !email.trim()) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        —
      </Typography>
    );
  }

  const trimmedEmail = email.trim();
  const employee = lookup(trimmedEmail);
  const fullName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : "";
  // Unresolved addresses keep showing the email, so nothing regresses while the directory
  // is still loading or when the person genuinely isn't in it.
  const label = fullName || trimmedEmail;
  const initial = (fullName || trimmedEmail).charAt(0).toUpperCase() || "E";
  const dimensions = SIZES[size];

  const chip = (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        maxWidth: "100%",
        borderRadius: "100px",
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : theme.palette.action.hover,
        padding: dimensions.padding,
      }}
    >
      <Avatar
        src={employee?.employeeThumbnail || undefined}
        alt={label}
        imgProps={{ referrerPolicy: "no-referrer" }}
        sx={{
          width: dimensions.avatar,
          height: dimensions.avatar,
          fontSize: `${dimensions.initial}px`,
          fontWeight: 600,
          bgcolor: theme.palette.primary.main,
        }}
      >
        {initial}
      </Avatar>
      <Box
        component="span"
        sx={{
          fontSize: `${dimensions.font}px`,
          fontWeight: 500,
          color: theme.palette.text.primary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Box>
    </Box>
  );

  // No tooltip when the label already is the email — there is nothing extra to reveal.
  if (!showTooltip || !fullName) return chip;

  return (
    <Tooltip title={trimmedEmail} arrow>
      {chip}
    </Tooltip>
  );
}

interface PeopleChipListProps {
  /** Comma-separated emails, or an array of emails. */
  emails: string | string[] | null | undefined;
  size?: PeopleChipSize;
}

/** Renders a wrapping row of `PeopleChip`s, or an em dash when there are none. */
export function PeopleChipList({ emails, size = "sm" }: PeopleChipListProps) {
  const list = Array.isArray(emails)
    ? emails.map((email) => email.trim()).filter(Boolean)
    : splitEmails(emails);

  if (list.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.875 }}>
      {list.map((email) => (
        <PeopleChip key={email} email={email} size={size} />
      ))}
    </Box>
  );
}
