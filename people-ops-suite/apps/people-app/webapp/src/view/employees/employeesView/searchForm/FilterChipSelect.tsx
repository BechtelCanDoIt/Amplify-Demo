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

import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import {
  alpha,
  Box,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import type { MouseEvent } from "react";
import { useMemo, useState } from "react";

export type FilterChipSelectProps<T> = {
  label: string;
  value: string | number | undefined;
  options: T[];
  getLabel: (o: T) => string;
  onChange: (o: T) => void;
  onClear: () => void;
};

export function FilterChipSelect<T>({
  label,
  value,
  options,
  getLabel,
  onChange,
  onClear,
}: FilterChipSelectProps<T>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accentColor = theme.palette.secondary.contrastText;
  const hasValue = value !== undefined && value !== null && value !== "";
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const chipText = useMemo(
    () => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: hasValue ? 0.75 : 0.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: hasValue
              ? alpha(accentColor, 0.85)
              : theme.palette.text.secondary,
            textTransform: "capitalize",
          }}
        >
          {hasValue ? `${label} ` : label}
        </Typography>

        {hasValue && (
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 700,
              color: isDark ? theme.palette.grey[100] : theme.palette.grey[800],
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
            }}
          >
            {`${value}`}
          </Typography>
        )}

        {open ? (
          <KeyboardArrowUp
            sx={{
              fontSize: "14px",
              color: hasValue ? accentColor : theme.palette.text.secondary,
            }}
          />
        ) : (
          <KeyboardArrowDown
            sx={{
              fontSize: "14px",
              color: hasValue ? accentColor : theme.palette.text.secondary,
            }}
          />
        )}
      </Box>
    ),
    [hasValue, accentColor, theme.palette.text.secondary, theme.palette.grey, label, isDark, value, open],
  );

  const openMenu = (event: MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const tooltipTitle =
    options.length === 0
      ? "No options available"
      : hasValue
        ? `${value}`
        : undefined;

  return (
    <>
      <Tooltip title={tooltipTitle} disableHoverListener={!tooltipTitle} arrow>
        <span
          style={{ cursor: options.length === 0 ? "not-allowed" : "pointer" }}
        >
          <Chip
            label={chipText}
            clickable={false}
            onClick={openMenu}
            disabled={options.length === 0}
            deleteIcon={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  height: "100%",
                  width: "26px",
                  color: theme.palette.text.disabled,
                  transition: "color 0.15s ease",
                  "&:hover": { color: theme.palette.error.main },
                }}
              >
                <CloseIcon sx={{ fontSize: 13 }} />
              </Box>
            }
            sx={{
              height: "32px",
              p: 0,
              backgroundColor: hasValue
                ? isDark
                  ? alpha(accentColor, 0.12)
                  : alpha(accentColor, 0.06)
                : isDark
                  ? theme.palette.background.paper
                  : "#fff",
              borderRadius: "50px",
              border: `1.5px solid ${hasValue ? accentColor : theme.palette.divider}`,
              transition:
                "border-color 0.15s ease, background-color 0.15s ease",
              "&:hover": {
                borderColor: accentColor,
                backgroundColor: isDark
                  ? alpha(accentColor, 0.14)
                  : alpha(accentColor, 0.05),
              },
              "&:active": { transform: "scale(0.98)" },
              "& .MuiChip-label": {
                pl: "12px",
                pr: "8px",
                borderRight: hasValue
                  ? `1px solid ${isDark ? alpha("#fff", 0.08) : theme.palette.divider}`
                  : "none",
                height: "100%",
                display: "flex",
                alignItems: "center",
                py: 0,
              },
              "& .MuiChip-deleteIcon": {
                margin: 0,
                height: "100%",
                borderRadius: "0 50px 50px 0",
              },
            }}
            onDelete={hasValue ? onClear : undefined}
            variant="outlined"
          />
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              maxHeight: 320,
              minWidth: 220,
              borderRadius: "8px",
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              mt: 0.5,
            },
          },
        }}
      >
        {options.length > 0 ? (
          options.map((o, idx) => {
            const optionLabel = getLabel(o);
            return (
              <MenuItem
                key={`${optionLabel}-${idx}`}
                selected={hasValue && optionLabel === String(value)}
                onClick={() => {
                  onChange(o);
                  closeMenu();
                }}
                sx={{
                  fontSize: "13px",
                  py: 0.75,
                  "&.Mui-selected": {
                    backgroundColor: alpha(accentColor, 0.1),
                    color: accentColor,
                    fontWeight: 600,
                    "&:hover": { backgroundColor: alpha(accentColor, 0.15) },
                  },
                  "&:hover": { backgroundColor: alpha(accentColor, 0.05) },
                }}
              >
                {optionLabel}
              </MenuItem>
            );
          })
        ) : (
          <MenuItem disabled key="no-options">
            No options available
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
