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

// Ports promotion-app's own view/administration/panels/userManagement.tsx
// — lists every promotion-app system user (an account + Role[] + optional
// Functional Lead ACL), not the whole employee directory. Add/edit,
// activate/deactivate, delete, transfer a lead's account to a different
// employee, and bulk-sync the user list from a Google Sheet.
//
// A data grid, matching the convention every other portal in this app
// already uses, instead of a hand-rolled column-header-plus-dashed-card
// list — that hand-rolled shape is what caused the header/row alignment
// drift a plain Grid can't avoid (its own `spacing` applies a compensating
// negative margin that a data grid's native column layout never has to
// fight).
import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  Chip,
  DataGrid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import { ArrowRightLeftIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, UploadIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import ConfirmationDialog, { type ConfirmationContent } from "@components/confirmation-dialog/ConfirmationDialog";
import { useUserInfo } from "@api/useUserInfo";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { useAdminUsers, useDeleteUser, useSyncUsers, useUpdateUser } from "../api/useAdminUsers";
import { usePromotionSyncState } from "../api/usePromotionSyncState";
import { PromotionGridToolbar } from "../components/PromotionGridToolbar";
import UserFormDialog from "../components/UserFormDialog";
import TransferAccessDialog from "../components/TransferAccessDialog";
import GoogleSheetLinkDialog from "../components/GoogleSheetLinkDialog";
import PromotionFeedbackSnackbar from "../components/PromotionFeedbackSnackbar";
import { usePromotionFeedback } from "../util/usePromotionFeedback";
import PromotionSyncStatusLabel from "../components/PromotionSyncStatusLabel";
import PromotionEmptyState from "../components/PromotionEmptyState";
import { promotionRoleChipColor } from "../util/promotionRoleColors";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { PromotionUser } from "../api/types";

export default function AdminUserManagementTab() {
  const userInfo = useUserInfo();
  const asgardeoUser = useAsgardeoUser();
  const selfEmail = userInfo.data?.workEmail ?? asgardeoUser.email;

  const users = useAdminUsers();
  const sync = usePromotionSyncState("SYNC_STATE", true);
  const syncUsers = useSyncUsers();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();

  const [search, setSearch] = useState("");
  const [formTarget, setFormTarget] = useState<PromotionUser | null | "insert">(null);
  const [transferTarget, setTransferTarget] = useState<PromotionUser | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [confirmContent, setConfirmContent] = useState<ConfirmationContent | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { feedback, notifySuccess, notifyError, close } = usePromotionFeedback();

  // Once a running sync settles, refetch the list on SUCCESS and notify on
  // either outcome. Ref-tracked off a "just transitioned" edge, not the raw
  // level, so this fires once per sync rather than on every re-render while
  // settled.
  const lastSyncState = useRef(sync.state);
  useEffect(() => {
    if (lastSyncState.current === sync.state) return;
    lastSyncState.current = sync.state;
    if (sync.state === "SUCCESS") {
      void users.refetch();
      notifySuccess("Successfully synchronized the user data.");
    } else if (sync.state === "ERROR") {
      notifyError("Unable to synchronize the user data. Please contact the app support.");
    }
  }, [sync.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const allUsers = users.data?.users.users ?? [];
  const businessUnits = users.data?.businessUnits.businessUnits ?? [];
  const filtered = allUsers.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const columns: DataGrid.GridColDef<PromotionUser>[] = [
    {
      display: "flex",
      field: "firstName",
      headerName: "User",
      flex: 1.4,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <Avatar src={params.row.employeeThumbnail ?? undefined} sx={{ width: 36, height: 36, flexShrink: 0 }}>
            {params.row.firstName?.[0]}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: params.row.email === selfEmail ? 700 : 500 }} noWrap>
              {params.row.firstName} {params.row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      display: "flex",
      field: "roles",
      headerName: "Roles",
      flex: 1.2,
      minWidth: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ py: 0.5 }}>
          {params.row.roles.map((role) => (
            <Chip key={role} label={role} size="small" variant="outlined" color={promotionRoleChipColor(role)} />
          ))}
        </Stack>
      ),
    },
    {
      display: "flex",
      field: "active",
      headerName: "Status",
      flex: 0.8,
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={params.row.active ? "active" : "inactive"}
          disabled={togglingId === params.row.id && updateUser.isPending}
          onChange={(_e, value) => {
            if (!value) return;
            const active = value === "active";
            setConfirmContent({
              title: active ? "Activate user" : "Deactivate user",
              text: `Are you sure do you want to ${active ? "activate" : "deactivate"} this user?`,
              confirmLabel: active ? "Activate" : "Deactivate",
              confirmAction: () => {
                setTogglingId(params.row.id);
                updateUser.mutate(
                  { id: params.row.id, active, roles: params.row.roles, functionalLeadAccessLevels: params.row.functionalLeadAccessLevels },
                  { onSettled: () => setTogglingId(null) },
                );
              },
            });
          }}
        >
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="inactive">Inactive</ToggleButton>
        </ToggleButtonGroup>
      ),
    },
    {
      display: "flex",
      field: "action",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      disableExport: true,
      flex: 0.7,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={{ display: "flex" }}>
          <Tooltip title="Transfer access">
            <IconButton size="small" onClick={() => setTransferTarget(params.row)}>
              <ArrowRightLeftIcon size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setFormTarget(params.row)}>
              <PencilIcon size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() =>
                setConfirmContent({
                  title: "Delete user",
                  text: `Are you sure you want to delete ${params.row.email}?`,
                  confirmLabel: "Delete",
                  confirmAction: () => deleteUser.mutate(params.row.id),
                })
              }
            >
              <Trash2Icon size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <>
      <ConfirmationDialog content={confirmContent} onClose={() => setConfirmContent(null)} />
      <PromotionFeedbackSnackbar feedback={feedback} onClose={close} />
      <UserFormDialog
        open={formTarget !== null}
        editingUser={formTarget === "insert" ? null : formTarget}
        existingEmails={allUsers.map((u) => u.email)}
        businessUnits={businessUnits}
        onClose={() => setFormTarget(null)}
      />
      <TransferAccessDialog user={transferTarget} onClose={() => setTransferTarget(null)} />
      <GoogleSheetLinkDialog
        open={syncDialogOpen}
        title="Google Sheet User Data Synchronization"
        onClose={() => setSyncDialogOpen(false)}
        onSubmit={(url) => {
          syncUsers.mutate(url, {
            onError: (error) => notifyError(`Unable to start the sync. ${humanizeHttpError(error)}`),
          });
          setSyncDialogOpen(false);
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {sync.state === "IN_PROGRESS" && <PromotionSyncStatusLabel message="Synchronizing user data..." />}
        </Box>
        <TextField
          size="small"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon size={16} /></InputAdornment> } }}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Import users from google sheet">
            <IconButton size="small" onClick={() => setSyncDialogOpen(true)}>
              <UploadIcon size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add a new user">
            <IconButton size="small" onClick={() => setFormTarget("insert")}>
              <PlusIcon size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {users.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : users.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load user information. ${humanizeHttpError(users.error)}`}
        />
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No users found
        </Typography>
      ) : (
        <Card variant="outlined" sx={{ p: 2 }}>
          <DataGrid.DataGrid
            rows={filtered}
            getRowId={(row) => row.id}
            columns={columns}
            // A user with several roles wraps the Roles cell onto a second
            // line — a fixed row height would then clip it (and crop the
            // Status/Actions cells beside it); let the row grow to fit.
            getRowHeight={() => "auto"}
            showToolbar
            slots={{ toolbar: PromotionGridToolbar }}
            sx={{
              border: "none",
              ...GRID_NO_POINTER_FOCUS_SX,
              // Auto row height needs its own vertical padding; without it
              // the chips sit flush against the row divider.
              "& .MuiDataGrid-cell": { py: 1, alignItems: "center" },
            }}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      )}
    </>
  );
}
