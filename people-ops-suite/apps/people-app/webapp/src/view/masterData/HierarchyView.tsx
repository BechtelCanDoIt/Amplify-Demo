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
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Switch,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@slices/store";
import {
  createBusinessUnitTeamMapping,
  createBusinessUnitTeamSubTeamMapping,
  createBusinessUnitTeamSubTeamUnitMapping,
  fetchCompanyOrgChartStructure,
  CompanyOrgChartEntity,
  CompanyOrgChartBusinessUnit,
  CompanyOrgChartSubTeam,
  CompanyOrgChartTeam,
  CompanyOrgChartUnit,
  selectOrgStructure,
  selectTeams,
  selectSubTeams,
  selectUnits,
  UpdateMappingPayload,
  updateBusinessUnitTeamMapping,
  updateBusinessUnitTeamSubTeamMapping,
  updateBusinessUnitTeamSubTeamUnitMapping,
} from "@slices/masterDataSlice/masterData";
import MappingDialog, { MappingLevel } from "./MappingDialog";
import EmployeeEmailSelect from "@component/EmployeeEmailSelect/EmployeeEmailSelect";

// ─── EditFunctionalHeadDialog ─────────────────────────────────────────────────

function EditFunctionalHeadDialog({
  open,
  currentHeadEmail,
  currentIsActive,
  onClose,
  onSubmit,
}: {
  open: boolean;
  currentHeadEmail: string;
  currentIsActive: boolean;
  onClose: () => void;
  onSubmit: (headEmail: string, isActive: boolean) => Promise<void>;
}) {
  const theme = useTheme();
  const [headEmail, setHeadEmail] = useState(currentHeadEmail);
  const [isActive, setIsActive] = useState(currentIsActive);
  const [submitting, setSubmitting] = useState(false);

  // Sync values whenever the dialog opens
  useEffect(() => {
    if (open) {
      setHeadEmail(currentHeadEmail);
      setIsActive(currentIsActive);
    }
  }, [open, currentHeadEmail, currentIsActive]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(headEmail, isActive);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Functional Head</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
          <EmployeeEmailSelect
            mode="single"
            label="Functional Head Email"
            value={headEmail}
            onChange={setHeadEmail}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: theme.palette.secondary.contrastText,
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: theme.palette.secondary.contrastText,
                  },
                }}
              />
            }
            label={isActive ? "Active" : "Inactive"}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : null}
          sx={{ textTransform: "none" }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ColumnPanel ─────────────────────────────────────────────────────────────

interface ColumnPanelProps {
  title: string;
  onAssign?: () => void;
  assignLabel?: string;
  assignDisabled?: boolean;
  emptyMessage: string;
  itemCount: number;
  children: React.ReactNode;
}

function ColumnPanel({
  title,
  onAssign,
  assignLabel,
  assignDisabled,
  emptyMessage,
  itemCount,
  children,
}: ColumnPanelProps) {
  const theme = useTheme();
  const hasChildren = itemCount > 0;

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Column header — matches DataGrid column header style */}
      <Box
        sx={{
          px: 2,
          minHeight: 56,
          maxHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.palette.text.primary,
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </Typography>
        {onAssign && (
          <Tooltip title={assignDisabled ? "Select a parent first" : ""} arrow>
            <span>
              <Button
                size="small"
                color="secondary"
                startIcon={<AddIcon sx={{ fontSize: "14px !important" }} />}
                onClick={onAssign}
                disabled={assignDisabled}
                sx={{ fontSize: 13, py: 0.5, minWidth: 0, textTransform: "none" }}
              >
                {assignLabel}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Column body */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {hasChildren ? children : (
          <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 14, color: "text.disabled" }}>
              {emptyMessage}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── ColumnItem ───────────────────────────────────────────────────────────────

interface ColumnItemProps {
  name: string;
  isActive: boolean;
  disabled?: boolean;
  functionalHead?: string;
  selected?: boolean;
  hasChildren?: boolean;
  onClick?: () => void;
  onEditHead?: () => void;
}

function ColumnItem({
  name,
  isActive,
  disabled = false,
  functionalHead,
  selected,
  hasChildren,
  onClick,
  onEditHead,
}: ColumnItemProps) {
  const theme = useTheme();

  const content = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderBottom: `1px solid ${theme.palette.divider}`,
        minHeight: 52,
        backgroundColor: selected
          ? theme.palette.action.selected
          : alpha(theme.palette.background.paper, 0.5),
        ...(!disabled && {
          "&:hover": {
            backgroundColor: selected
              ? theme.palette.action.focus
              : theme.palette.action.hover,
            "& .item-actions": { opacity: 1 },
          },
        }),
        transition: "background-color 0.2s ease",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {/* Left: text content */}
      <Box sx={{ flex: 1, minWidth: 0, pl: 2, py: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: selected ? 600 : 400,
              color: isActive ? theme.palette.text.primary : theme.palette.text.disabled,
              lineHeight: 1.4,
            }}
          >
            {name}
          </Typography>
          {!isActive && (
            <Chip
              label="Inactive"
              size="small"
              variant="outlined"
              color="error"
              sx={{ fontWeight: 700, fontSize: 11, height: 24, borderRadius: 2 }}
            />
          )}
        </Box>
        {functionalHead && (
          <Typography
            sx={{
              display: "block",
              mt: 0.25,
              fontSize: 12,
              color: theme.palette.text.secondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Functional Head: {functionalHead}
          </Typography>
        )}
      </Box>

      {/* Right: action buttons + chevron in a single flex container — no absolute positioning */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          pr: 0.5,
        }}
      >
        {onEditHead && (
          <Box
            className="item-actions"
            sx={{
              display: "flex",
              gap: 0.25,
              opacity: selected ? 1 : 0,
              transition: "opacity 0.15s",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Edit" arrow>
              <IconButton size="small" onClick={onEditHead}>
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {hasChildren && (
          <ChevronRightIcon
            sx={{
              color: selected ? "primary.main" : "text.disabled",
              fontSize: "1.1rem",
              ml: 0.5,
            }}
          />
        )}
      </Box>
    </Box>
  );

  if (disabled) {
    return (
      <Tooltip
        title="This entity is inactive. To make changes, activate it first from the Business Units, Teams, Sub Teams, or Units tab."
        arrow
        placement="right"
      >
        <span>{content}</span>
      </Tooltip>
    );
  }

  return content;
}

// ─── MappingHeadDialogState ───────────────────────────────────────────────────

interface MappingHeadDialogState {
  open: boolean;
  mappingId: number | null;
  mappingType: "bu-team" | "bu-team-st" | "bu-team-st-unit" | null;
  currentHeadEmail: string;
  currentIsActive: boolean;
}

// ─── HierarchyView ───────────────────────────────────────────────────────────

export default function HierarchyView() {
  const dispatch = useAppDispatch();
  const orgStructure = useAppSelector(selectOrgStructure);
  const allTeams = useAppSelector(selectTeams);
  const allSubTeams = useAppSelector(selectSubTeams);
  const allUnits = useAppSelector(selectUnits);

  // Column selection state
  const [selectedBUId, setSelectedBUId] = useState<number | null>(null);
  const [selectedTeamMappingId, setSelectedTeamMappingId] = useState<number | null>(null);
  const [selectedSubTeamMappingId, setSelectedSubTeamMappingId] = useState<number | null>(null);

  // Derived data
  const selectedBU = orgStructure.find((bu) => bu.id === selectedBUId) ?? null;
  const visibleTeams: CompanyOrgChartTeam[] = selectedBU?.teams ?? [];
  const selectedTeam = visibleTeams.find((t) => t.mappingId === selectedTeamMappingId) ?? null;
  const visibleSubTeams: CompanyOrgChartSubTeam[] = selectedTeam?.subTeams ?? [];
  const selectedSubTeam = visibleSubTeams.find((st) => st.mappingId === selectedSubTeamMappingId) ?? null;
  const visibleUnits: CompanyOrgChartUnit[] = selectedSubTeam?.units ?? [];

  const sortedBUs = useMemo(
    () => [...orgStructure].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    [orgStructure],
  );
  const sortedTeams = useMemo(
    () => {
      const score = (t: CompanyOrgChartTeam) => (!t.isActive ? 0 : t.mappingIsActive ? 2 : 1);
      return [...visibleTeams].sort((a, b) => score(b) - score(a));
    },
    [visibleTeams],
  );
  const sortedSubTeams = useMemo(
    () => {
      const score = (st: CompanyOrgChartSubTeam) => (!st.isActive ? 0 : st.mappingIsActive ? 2 : 1);
      return [...visibleSubTeams].sort((a, b) => score(b) - score(a));
    },
    [visibleSubTeams],
  );
  const sortedUnits = useMemo(
    () => {
      const score = (u: CompanyOrgChartUnit) => (!u.isActive ? 0 : u.mappingIsActive ? 2 : 1);
      return [...visibleUnits].sort((a, b) => score(b) - score(a));
    },
    [visibleUnits],
  );

  // Dialog state
  const [mappingDialog, setMappingDialog] = useState<{
    open: boolean;
    level: MappingLevel;
    parentLabel: string;
    parentId: number;
    availableEntities: CompanyOrgChartEntity[];
  }>({
    open: false,
    level: "team",
    parentLabel: "",
    parentId: 0,
    availableEntities: [],
  });

  const [headDialog, setHeadDialog] = useState<MappingHeadDialogState>({
    open: false,
    mappingId: null,
    mappingType: null,
    currentHeadEmail: "",
    currentIsActive: true,
  });

  // Selection handlers (cascade-clear child selections)
  const selectBU = (id: number) => {
    setSelectedBUId((prev) => (prev === id ? null : id));
    setSelectedTeamMappingId(null);
    setSelectedSubTeamMappingId(null);
  };

  const selectTeam = (mappingId: number) => {
    setSelectedTeamMappingId((prev) => (prev === mappingId ? null : mappingId));
    setSelectedSubTeamMappingId(null);
  };

  const selectSubTeam = (mappingId: number) => {
    setSelectedSubTeamMappingId((prev) => (prev === mappingId ? null : mappingId));
  };

  const refresh = useCallback(() => {
    dispatch(fetchCompanyOrgChartStructure());
  }, [dispatch]);

  // Assign-dialog openers
  const openAssignTeam = () => {
    if (!selectedBU) return;
    const assignedIds = new Set(selectedBU.teams.map((t) => t.id));
    const available = allTeams.filter((t) => !assignedIds.has(t.id) && t.isActive);
    setMappingDialog({ open: true, level: "team", parentLabel: selectedBU.name, parentId: selectedBU.id, availableEntities: available });
  };

  const openAssignSubTeam = () => {
    if (!selectedTeam) return;
    const assignedIds = new Set(selectedTeam.subTeams.map((st) => st.id));
    const available = allSubTeams.filter((st) => !assignedIds.has(st.id) && st.isActive);
    setMappingDialog({ open: true, level: "sub-team", parentLabel: selectedTeam.name, parentId: selectedTeam.mappingId, availableEntities: available });
  };

  const openAssignUnit = () => {
    if (!selectedSubTeam) return;
    const assignedIds = new Set(selectedSubTeam.units.map((u) => u.id));
    const available = allUnits.filter((u) => !assignedIds.has(u.id) && u.isActive);
    setMappingDialog({ open: true, level: "unit", parentLabel: selectedSubTeam.name, parentId: selectedSubTeam.mappingId, availableEntities: available });
  };

  const handleMappingSubmit = async (entityId: number, headEmail: string) => {
    const { level, parentId } = mappingDialog;
    try {
      if (level === "team") {
        await dispatch(createBusinessUnitTeamMapping({ businessUnitId: parentId, teamId: entityId, headEmail })).unwrap();
      } else if (level === "sub-team") {
        await dispatch(createBusinessUnitTeamSubTeamMapping({ businessUnitTeamId: parentId, subTeamId: entityId, headEmail })).unwrap();
      } else {
        await dispatch(createBusinessUnitTeamSubTeamUnitMapping({ businessUnitTeamSubTeamId: parentId, unitId: entityId, headEmail })).unwrap();
      }
      refresh();
    } catch (_) {
      // error handled by the thunk (snackbar); keep dialog open for retry
    }
  };

  // Head-edit dialog
  const openHeadEdit = (
    mappingId: number,
    mappingType: MappingHeadDialogState["mappingType"],
    currentHeadEmail: string,
    currentIsActive: boolean,
  ) => {
    setHeadDialog({ open: true, mappingId, mappingType, currentHeadEmail, currentIsActive });
  };

  const handleHeadDialogSubmit = async (headEmail: string, isActive: boolean) => {
    const { mappingId, mappingType } = headDialog;
    if (mappingId == null || mappingType == null) return;
    const update: UpdateMappingPayload = { headEmail, isActive };
    try {
      if (mappingType === "bu-team") {
        await dispatch(updateBusinessUnitTeamMapping({ id: mappingId, payload: update })).unwrap();
        if (!isActive && selectedTeamMappingId === mappingId) {
          setSelectedTeamMappingId(null);
          setSelectedSubTeamMappingId(null);
        }
      } else if (mappingType === "bu-team-st") {
        await dispatch(updateBusinessUnitTeamSubTeamMapping({ id: mappingId, payload: update })).unwrap();
        if (!isActive && selectedSubTeamMappingId === mappingId) setSelectedSubTeamMappingId(null);
      } else {
        await dispatch(updateBusinessUnitTeamSubTeamUnitMapping({ id: mappingId, payload: update })).unwrap();
      }
      refresh();
    } catch (_) {
      // error handled by the thunk (snackbar); keep dialog open for retry
    }
  };

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden", px: 2, pt: 1.5 }}>
      {/* ── Business Units ── */}
      <ColumnPanel
        title="Business Unit"
        itemCount={orgStructure.length}
        emptyMessage="No business units found."
      >
        {sortedBUs.map((bu: CompanyOrgChartBusinessUnit) => (
          <ColumnItem
            key={bu.id}
            name={bu.name}
            isActive={bu.isActive}
            selected={selectedBUId === bu.id}
            hasChildren
            onClick={bu.isActive ? () => selectBU(bu.id) : undefined}
          />
        ))}
      </ColumnPanel>

      <Divider orientation="vertical" flexItem />

      {/* ── Teams ── */}
      <ColumnPanel
        title="Team"
        itemCount={visibleTeams.length}
        onAssign={openAssignTeam}
        assignLabel="Assign Team"
        assignDisabled={!selectedBU}
        emptyMessage={selectedBUId ? "No teams assigned to this Business Unit." : "Select a Business Unit to view teams."}
      >
        {sortedTeams.map((team: CompanyOrgChartTeam) => (
            <ColumnItem
              key={team.mappingId}
              name={team.name}
              isActive={team.isActive && team.mappingIsActive}
              disabled={!team.isActive}
              functionalHead={team.mappingHeadEmail}
              selected={selectedTeamMappingId === team.mappingId}
              hasChildren
              onClick={team.isActive ? () => selectTeam(team.mappingId) : undefined}
              onEditHead={team.isActive ? () => openHeadEdit(team.mappingId, "bu-team", team.mappingHeadEmail, team.mappingIsActive) : undefined}
            />
          ))}
      </ColumnPanel>

      <Divider orientation="vertical" flexItem />

      {/* ── Sub Teams ── */}
      <ColumnPanel
        title="Sub Team"
        itemCount={visibleSubTeams.length}
        onAssign={openAssignSubTeam}
        assignLabel="Assign Sub Team"
        assignDisabled={!selectedTeam}
        emptyMessage={selectedTeamMappingId ? "No sub-teams assigned to this Team." : "Select a Team to view sub-teams."}
      >
        {sortedSubTeams.map((st: CompanyOrgChartSubTeam) => (
            <ColumnItem
              key={st.mappingId}
              name={st.name}
              isActive={st.isActive && st.mappingIsActive}
              disabled={!st.isActive}
              functionalHead={st.mappingHeadEmail}
              selected={selectedSubTeamMappingId === st.mappingId}
              hasChildren
              onClick={st.isActive ? () => selectSubTeam(st.mappingId) : undefined}
              onEditHead={st.isActive ? () => openHeadEdit(st.mappingId, "bu-team-st", st.mappingHeadEmail, st.mappingIsActive) : undefined}
            />
          ))}
      </ColumnPanel>

      <Divider orientation="vertical" flexItem />

      {/* ── Units ── */}
      <ColumnPanel
        title="Unit"
        itemCount={visibleUnits.length}
        onAssign={openAssignUnit}
        assignLabel="Assign Unit"
        assignDisabled={!selectedSubTeam}
        emptyMessage={selectedSubTeamMappingId ? "No units assigned to this Sub Team." : "Select a Sub Team to view units."}
      >
        {sortedUnits.map((unit: CompanyOrgChartUnit) => (
            <ColumnItem
              key={unit.mappingId}
              name={unit.name}
              isActive={unit.isActive && unit.mappingIsActive}
              disabled={!unit.isActive}
              functionalHead={unit.mappingHeadEmail}
              selected={false}
              onEditHead={unit.isActive ? () => openHeadEdit(unit.mappingId, "bu-team-st-unit", unit.mappingHeadEmail, unit.mappingIsActive) : undefined}
            />
          ))}
      </ColumnPanel>

      {/* Mapping assignment dialog */}
      <MappingDialog
        open={mappingDialog.open}
        onClose={() => setMappingDialog((prev) => ({ ...prev, open: false }))}
        level={mappingDialog.level}
        parentLabel={mappingDialog.parentLabel}
        availableEntities={mappingDialog.availableEntities}
        onSubmit={handleMappingSubmit}
      />

      {/* Functional head edit dialog */}
      <EditFunctionalHeadDialog
        open={headDialog.open}
        currentHeadEmail={headDialog.currentHeadEmail}
        currentIsActive={headDialog.currentIsActive}
        onClose={() => setHeadDialog((prev) => ({ ...prev, open: false }))}
        onSubmit={handleHeadDialogSubmit}
      />
    </Box>
  );
}
