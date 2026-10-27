// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import React from "react";
import { colors, Typography } from "@mui/material";
import ListItem from "@mui/material/ListItem";
import { Theme, alpha } from "@mui/material/styles";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import {
  NavLink as RouterLink,
  LinkProps as RouterLinkProps,
} from "react-router-dom";

interface ListItemLinkProps {
  icon?: React.ReactElement;
  primary: string;
  to: string;
  open: boolean;
  isActive: boolean;
  theme: Theme;
  isHighlighted?: boolean;
  isExpandable?: boolean;
  isExpanded?: boolean;
  isChild?: boolean;
  isLastChild?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, RouterLinkProps>(function Link(
  itemProps,
  ref
) {
  return (
    <RouterLink
      ref={ref}
      {...itemProps}
      role={undefined}
      style={({ isActive }) =>
        isActive ? { background: alpha("#FFFFFF", 0.05), color: "#FF7300" } : {}
      }
    />
  );
});

const ListItemLink = (props: ListItemLinkProps) => {
  const {
    icon,
    primary,
    to,
    open,
    theme,
    isActive,
    isHighlighted = false,
    isExpandable = false,
    isExpanded = false,
    isChild = false,
    isLastChild = false,
  } = props;

  return (
    <ListItem
      component={Link}
      to={to}
      sx={{
        cursor: "pointer",
        borderRadius: 2,
        borderBottomLeftRadius: 0,
        borderTopLeftRadius: 0,
        borderLeft: `2px solid transparent`,
        ...(isChild
          ? !open && {
              borderTopRightRadius: 0,
              ...(!isLastChild && { borderBottomRightRadius: 0 }),
            }
          : isExpanded && {
              borderBottomRightRadius: 0,
            }),
        py: 1.5,
        "&:hover": {
          background: (theme) =>
            theme.palette.mode === "light"
              ? alpha(theme.palette.common.white, 0.35)
              : alpha(theme.palette.primary.main, 0.35),
          ...(!open && {
            "& .menu-tooltip": {
              opacity: 1,
              marginLeft: -3,
              visibility: "visible",
              color: (theme) => theme.palette.common.white,
              background: (theme) => theme.palette.primary.dark,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0px 0px 10px rgba(120, 125, 129, 0.2)"
                  : 10,
            },
          }),
        },
        ...((isActive ||
          (!open && isHighlighted) ||
          (open && isHighlighted && isExpanded === isChild)) && {
          background: (theme) =>
            theme.palette.mode === "light"
              ? alpha(theme.palette.common.white, 0.1)
              : alpha(theme.palette.primary.main, 0.1),
        }),
        ...((isActive || (!isExpanded && !isChild && isHighlighted)) && {
          borderLeft: "3px solid",
          borderColor: theme.palette.secondary.contrastText,
        }),
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      {icon && (
        <ListItemIcon
          sx={{
            py: 0.3,
            color: (theme) => theme.palette.common.white,
            ...(open && isChild && { ml: 2 }),
          }}
        >
          {icon}
          {!open &&
            isExpandable &&
            (isExpanded ? (
              <ExpandLessIcon
                sx={{
                  color: colors.grey[500],
                  fontSize: 18,
                  ml: 0.5,
                  mr: 0.5,
                }}
              />
            ) : (
              <ExpandMoreIcon
                sx={{
                  color: colors.grey[500],
                  fontSize: 18,
                  ml: 0.5,
                  mr: 0.5,
                }}
              />
            ))}
        </ListItemIcon>
      )}
      {open && (
        <ListItemText
          sx={{
            my: 0,
            ml: -2,
            fontSize: 18,
            cursor: "pointer",
            "& .MuiListItemText-primary": {
              color: (theme) => theme.palette.common.white,
            },
          }}
          primary={primary}
        />
      )}

      <span className="menu-tooltip">
        <Typography variant="body2">{primary}</Typography>
      </span>
      {isExpandable &&
        (isExpanded ? (
          <ExpandLessIcon
            sx={{ ml: 1, color: colors.grey[500], fontSize: 18 }}
          />
        ) : (
          <ExpandMoreIcon
            sx={{ ml: 1, color: colors.grey[500], fontSize: 18 }}
          />
        ))}
    </ListItem>
  );
};

export default ListItemLink;
