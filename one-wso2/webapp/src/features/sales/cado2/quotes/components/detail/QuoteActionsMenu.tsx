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

import { useState, type JSX, type ReactNode } from "react";
import {
  alpha,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@wso2/oxygen-ui";
import { ChevronDownIcon, EllipsisIcon } from "@wso2/oxygen-ui-icons-react";

export interface QuoteMenuAction {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  /** A quiet second line under the label, e.g. when it was last done. */
  readonly detail?: string;
  readonly disabled?: boolean;
}

/**
 * The "Actions ▾" menu of the quote page (2026-10-12) and the wizard
 * (2026-10-13; a labelled button since D100, was "⋯"): everyday actions first,
 * then, below a line and in red, the destructive ones, so neither sits next
 * to the page's one main button. Hidden when there is nothing to offer.
 * Also a Quotes list row's "⋯" (2026-10-13): `inRow` gives a small borderless
 * button that doesn't open the row, and `label` names it for that row.
 */
export default function QuoteActionsMenu({
  actions,
  destructive,
  label = "More actions",
  inRow = false,
}: {
  actions: readonly QuoteMenuAction[];
  destructive: readonly QuoteMenuAction[];
  label?: string;
  inRow?: boolean;
}): JSX.Element | null {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  if (actions.length + destructive.length === 0) return null;

  const item = (a: QuoteMenuAction, danger: boolean) => (
    <MenuItem
      key={a.label}
      sx={danger ? { color: "error.main" } : undefined}
      disabled={a.disabled}
      onClick={() => {
        setAnchorEl(null);
        a.onClick();
      }}
    >
      <ListItemIcon sx={{ color: "inherit" }}>{a.icon}</ListItemIcon>
      <ListItemText
        primary={a.label}
        secondary={a.detail}
        slotProps={{ secondary: { variant: "caption" } }}
      />
    </MenuItem>
  );

  return (
    <>
      {inRow ? (
        <IconButton
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={anchorEl !== null}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          }}
        >
          <EllipsisIcon size={16} />
        </IconButton>
      ) : (
        // In a page header: a labelled "Actions" button, clearer than "⋯",
        // also when there is no main button beside it (D100).
        <Button
          variant="outlined"
          color="inherit"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={anchorEl !== null}
          endIcon={<ChevronDownIcon size={16} />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ borderColor: (t) => alpha(t.palette.text.primary, 0.4), "&:hover": { borderColor: "text.primary" } }}
        >
          Actions
        </Button>
      )}
      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={() => setAnchorEl(null)}
        // Clicks inside the menu never reach a clickable row behind it.
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {actions.map((a) => item(a, false))}
        {actions.length > 0 && destructive.length > 0 ? <Divider /> : null}
        {destructive.map((a) => item(a, true))}
      </Menu>
    </>
  );
}
