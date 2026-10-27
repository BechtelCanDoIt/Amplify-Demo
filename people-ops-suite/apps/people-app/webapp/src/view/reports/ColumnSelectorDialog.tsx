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

import {
  BadgeOutlined,
  PersonOutlineOutlined,
  WorkOutline,
  CorporateFareOutlined,
  EventOutlined,
  SupervisorAccountOutlined,
  ExitToAppOutlined,
} from "@mui/icons-material";
import ClearIcon from "@mui/icons-material/Clear";
import {
  alpha,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "./reportColumns";

interface ColumnSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  /** Full ordered column list for this report type. */
  columns: ColumnDef[];
  /** Currently applied selection (array of canonical keys). */
  selectedKeys: string[];
  /** Called with the new ordered key array when the user clicks Apply. */
  onApply: (keys: string[]) => void;
}

/** Icons for each group — aligned to Onboard page section icons. */
const GROUP_ICONS: Record<string, React.ReactNode> = {
  "Identity":        <BadgeOutlined />,
  "Job & Career":    <WorkOutline />,
  "Organisation":    <CorporateFareOutlined />,
  "Dates & Service": <EventOutlined />,
  "Management":      <SupervisorAccountOutlined />,
  "Resignation":     <ExitToAppOutlined />,
  "Personal":        <PersonOutlineOutlined />,
};

export function ColumnSelectorDialog({
  open,
  onClose,
  columns,
  selectedKeys,
  onApply,
}: ColumnSelectorDialogProps) {
  const theme = useTheme();

  // Draft uses a Set for O(1) lookups in the render loop.
  // Synced from selectedKeys on each open transition — same pattern as FilterDrawer.
  const [draft, setDraft] = useState<Set<string>>(new Set(selectedKeys));

  useEffect(() => {
    if (open) {
      setDraft(new Set(selectedKeys));
    }
  }, [open, selectedKeys]);

  // Build groups in insertion order so column group ordering from reportColumns.ts is preserved.
  const groups = useMemo(
    () =>
      columns.reduce<Map<string, ColumnDef[]>>((acc, col) => {
        const existing = acc.get(col.group);
        if (existing) {
          existing.push(col);
        } else {
          acc.set(col.group, [col]);
        }
        return acc;
      }, new Map()),
    [columns],
  );

  const groupEntries = Array.from(groups.entries());
  const allSelected = draft.size === columns.length;
  const noneSelected = draft.size === 0;

  function toggle(key: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleGroup(keys: string[], checked: boolean) {
    setDraft((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (checked ? next.add(k) : next.delete(k)));
      return next;
    });
  }

  function handleApply() {
    // Re-filter through canonical order to guarantee column order is always preserved.
    const orderedKeys = columns.map((c) => c.key).filter((k) => draft.has(k));
    onApply(orderedKeys);
    onClose();
  }

  const iconBoxSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 2,
    flexShrink: 0,
    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.contrastText, 0.2)}, ${alpha(theme.palette.secondary.contrastText, 0.1)})`,
    color: theme.palette.secondary.contrastText,
  };

  const checkboxSx = {
    color: theme.palette.secondary.contrastText,
    "&.Mui-checked": { color: theme.palette.secondary.contrastText },
    "&.MuiCheckbox-indeterminate": { color: theme.palette.secondary.contrastText },
    py: 0.5,
    px: 1,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h5" color="primary">
          Select Columns
        </Typography>
        <IconButton size="small" color="primary" onClick={onClose}>
          <ClearIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, px: 3 }}>
        {/* Master select/deselect toggle */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={allSelected}
                indeterminate={!noneSelected && !allSelected}
                onChange={(e) =>
                  setDraft(
                    e.target.checked
                      ? new Set(columns.map((c) => c.key))
                      : new Set(),
                  )
                }
                sx={checkboxSx}
              />
            }
            label={
              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {allSelected
                  ? "All columns selected"
                  : `${draft.size} of ${columns.length} selected`}
              </Typography>
            }
          />
        </Box>

        {/* Groups laid out in a 2-column grid to minimise scroll */}
        <Grid container spacing={2} alignItems="flex-start">
          {groupEntries.map(([groupName, cols]) => {
            const groupKeys = cols.map((c) => c.key);
            const allGroupSelected = groupKeys.every((k) => draft.has(k));
            const someGroupSelected = groupKeys.some((k) => draft.has(k));
            const icon = GROUP_ICONS[groupName] ?? <BadgeOutlined />;

            return (
              <Grid item xs={12} md={6} key={groupName}>
                {/* Section header: icon + name + dotted connector + group checkbox */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <Box sx={iconBoxSx}>{icon}</Box>
                  <Typography variant="h6" fontWeight={600} sx={{ whiteSpace: "nowrap", fontSize: "1rem" }}>
                    {groupName}
                  </Typography>
                  {/* Dotted connector — visually links name to its checkbox */}
                  <Box
                    sx={{
                      flex: 1,
                      height: 0,
                      borderBottom: "1.5px dashed",
                      borderColor: "divider",
                      mx: 0.5,
                      opacity: 0.5,
                    }}
                  />
                  <Checkbox
                    checked={allGroupSelected}
                    indeterminate={someGroupSelected && !allGroupSelected}
                    onChange={(e) => toggleGroup(groupKeys, e.target.checked)}
                    size="small"
                    sx={checkboxSx}
                  />
                </Box>

                {/* 2-column checkbox grid within each group (group is ~50% of dialog) */}
                <Grid container spacing={0.5}>
                  {cols.map((col) => (
                    <Grid item xs={12} sm={6} key={col.key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={draft.has(col.key)}
                            onChange={() => toggle(col.key)}
                            size="small"
                            sx={checkboxSx}
                          />
                        }
                        label={
                          <Typography variant="body1" sx={{ fontSize: "0.875rem" }}>{col.label}</Typography>
                        }
                        sx={{ ml: 0, mr: 0, width: "100%" }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          variant="text"
          color="inherit"
          sx={{ textTransform: "none" }}
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          variant="outlined"
          color="primary"
          sx={{ textTransform: "none" }}
          disabled={noneSelected}
          onClick={() => setDraft(new Set())}
        >
          Deselect All
        </Button>
        <Button
          variant="contained"
          color="secondary"
          sx={{ textTransform: "none" }}
          disabled={noneSelected}
          onClick={handleApply}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
