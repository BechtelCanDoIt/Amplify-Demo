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

import { useState, type JSX } from "react";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@wso2/oxygen-ui";
import {
  BadgeCheckIcon,
  LandmarkIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import LegalEntityDrawer from "@features/sales/cado2/admin/legal-entities/components/LegalEntityDrawer";
import {
  useCreateLegalEntity,
  useLegalEntities,
  useUpdateLegalEntity,
} from "@features/sales/cado2/admin/legal-entities/api/useLegalEntities";
import type { LegalEntity, LegalEntityFormValues } from "@features/sales/cado2/admin/legal-entities/api/legalEntityTypes";
import { initialsOfName } from "@features/sales/cado2/utils/initials";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";

/** The drawer's state: closed, adding, or editing one entity. */
type DrawerState = { open: false } | { open: true; entity: LegalEntity | null };

/**
 * Admin → Legal Entities (a card grid): the
 * WSO2 companies a quote can be issued from. Entities are disabled rather
 * than deleted, because quotes refer to them.
 */
export default function LegalEntitiesPage(): JSX.Element {
  const { data: entities, error, isPending, isFetching, refetch } = useLegalEntities();
  const create = useCreateLegalEntity();
  const update = useUpdateLegalEntity();
  const notify = useCado2Toast();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Switching an entity off asks first; on is instant (2026-10-13).
  const [deactivating, setDeactivating] = useState<LegalEntity | null>(null);

  const openDrawer = (entity: LegalEntity | null) => {
    create.reset();
    update.reset();
    setDrawer({ open: true, entity });
  };

  const onSave = (values: LegalEntityFormValues) => {
    if (!drawer.open) return;
    const done = {
      onSuccess: () => {
        setDrawer({ open: false });
        notify(`${values.name} saved`);
      },
    };
    if (drawer.entity) {
      // The code is fixed, so it is never sent on update.
      const { code: _code, ...changes } = values;
      void _code;
      update.mutate({ id: drawer.entity.id, changes }, done);
    } else {
      create.mutate(values, done);
    }
  };

  const saving = create.isPending || (drawer.open && drawer.entity !== null && update.isPending);
  const saveError = drawer.open ? (drawer.entity ? update.error : create.error) : null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 1400 }}>
      <PageHeader
        title="Legal Entities"
        actions={
          <Button variant="contained" size="large" startIcon={<PlusIcon size={18} />} onClick={() => openDrawer(null)}>
            Add entity
          </Button>
        }
      />

      {error ? (
        <ErrorNotice error={error} onRetry={() => void refetch()} retrying={isFetching}>
          Couldn&apos;t load legal entities.
        </ErrorNotice>
      ) : isPending ? (
        <Box sx={GRID} aria-label="Loading legal entities">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={210} />
          ))}
        </Box>
      ) : entities.length === 0 ? (
        <EmptyState
          icon={<LandmarkIcon size={28} />}
          title="No legal entities yet"
          body="Add the WSO2 companies quotes are issued from. A quote needs one before it can be submitted."
          action={
            <Button variant="contained" startIcon={<PlusIcon size={16} />} onClick={() => openDrawer(null)}>
              Add the first entity
            </Button>
          }
        />
      ) : (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField
              size="small"
              placeholder="Search name, code or country"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, maxWidth: { sm: 420 } }}
              slotProps={{
                htmlInput: { "aria-label": "Search legal entities" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={status}
              onChange={(_, v: typeof status | null) => v && setStatus(v)}
              aria-label="Filter by status"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="inactive">Inactive</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <MasterDetail
            entities={filterEntities(entities, search, status)}
            selectedId={selectedId}
            onSelect={setSelectedId}
            busy={update.isPending}
            onToggle={(e, on) => {
              if (!on) {
                update.reset();
                setDeactivating(e);
                return;
              }
              update.mutate({ id: e.id, changes: { isActive: true } }, { onSuccess: () => notify(`${e.name} activated`) });
            }}
            onEdit={(e) => openDrawer(e)}
          />
        </>
      )}

      {/* A failed toggle has no drawer to show its error in. */}
      {!drawer.open && !deactivating && update.error ? (
        <ErrorNotice error={update.error} sx={{ mt: 2 }}>
          Couldn&apos;t change the entity.
        </ErrorNotice>
      ) : null}

      <LegalEntityDrawer
        open={drawer.open}
        entity={drawer.open ? drawer.entity : null}
        onSave={onSave}
        onClose={() => setDrawer({ open: false })}
        saving={saving}
        saveError={saveError}
      />

      {deactivating ? (
        <LifecycleDialog
          title={`Deactivate ${deactivating.name}?`}
          confirmLabel="Deactivate"
          danger
          pending={update.isPending}
          error={update.error}
          onClose={() => setDeactivating(null)}
          onConfirm={() =>
            update.mutate(
              { id: deactivating.id, changes: { isActive: false } },
              {
                onSuccess: () => {
                  notify(`${deactivating.name} deactivated`);
                  setDeactivating(null);
                },
              },
            )
          }
        >
          It won&apos;t be offered on new quotes. A draft that uses it must choose another legal entity before it can be
          submitted. Submitted quotes don&apos;t change. You can switch it on again.
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}

const GRID = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(340px, 1fr))" },
  gap: 2,
} as const;

/** Case-insensitive match on name, code or country, then the status filter. */
function filterEntities(
  all: readonly LegalEntity[],
  search: string,
  status: "all" | "active" | "inactive",
): LegalEntity[] {
  const term = search.trim().toLowerCase();
  return all.filter(
    (e) =>
      (status === "all" || (status === "active") === e.isActive) &&
      (!term || [e.name, e.code, e.country].some((f) => f.toLowerCase().includes(term))),
  );
}

/**
 * Master–detail (F5 feedback, 2026-09-25): a compact list for scanning a dozen
 * or more entities, and everything about the selected one beside it.
 */
function MasterDetail({
  entities,
  selectedId,
  onSelect,
  busy,
  onToggle,
  onEdit,
}: {
  entities: readonly LegalEntity[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  busy: boolean;
  onToggle: (e: LegalEntity, active: boolean) => void;
  onEdit: (e: LegalEntity) => void;
}): JSX.Element {
  if (entities.length === 0) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <EmptyState compact icon={<SearchIcon size={20} />} title="No legal entities match" body="Try another name, code or country, or show All." />
      </Paper>
    );
  }
  const selected = entities.find((e) => e.id === selectedId) ?? entities[0];
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "360px minmax(0,1fr)" },
        gap: 2.5,
        alignItems: "start",
      }}
    >
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box
          component="ul"
          aria-label="Legal entities"
          sx={{ listStyle: "none", m: 0, p: 0, maxHeight: { md: 640 }, overflowY: "auto" }}
        >
          {entities.map((e, i) => {
            const on = e.id === selected.id;
            return (
              <li key={e.id}>
                <ButtonBase
                  onClick={() => onSelect(e.id)}
                  aria-current={on ? "true" : undefined}
                  aria-label={e.name}
                  sx={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "flex-start",
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    textAlign: "left",
                    borderTop: i === 0 ? 0 : 1,
                    borderColor: "divider",
                    borderLeft: 3,
                    borderLeftColor: on ? "primary.main" : "transparent",
                    bgcolor: on ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: on ? "action.selected" : "action.hover" },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: 14,
                      fontWeight: 600,
                      bgcolor: e.isActive ? "primary.main" : "action.disabledBackground",
                      color: e.isActive ? "primary.contrastText" : "text.secondary",
                    }}
                  >
                    {initialsOfName(e.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: e.isActive ? "text.primary" : "text.secondary" }}
                      noWrap
                    >
                      {e.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {e.code} · {e.country}
                    </Typography>
                  </Box>
                  <Box
                    aria-hidden
                    title={e.isActive ? "Active" : "Inactive"}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      bgcolor: e.isActive ? "success.main" : "text.disabled",
                    }}
                  />
                </ButtonBase>
              </li>
            );
          })}
        </Box>
      </Paper>
      <EntityDetail
        entity={selected}
        busy={busy}
        onToggle={(on) => onToggle(selected, on)}
        onEdit={() => onEdit(selected)}
      />
    </Box>
  );
}

/** Everything about one entity (F5 feedback). */
function EntityDetail({
  entity: e,
  busy,
  onToggle,
  onEdit,
}: {
  entity: LegalEntity;
  busy: boolean;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
}): JSX.Element {
  const cityLine = [e.city, e.stateProvince, e.postalCode].filter(Boolean).join(", ");
  const facts: [string, string | null][] = [
    ["Tax ID", e.taxId],
    ["Registration number", e.registrationNumber],
    ["Phone", e.phone],
  ];
  // The shared card (2026-10-13; was its own record header with a big avatar
  // and a coloured top bar): the name as title, the switch and Edit beside it.
  return (
    <SectionCard
      title={e.name}
      icon={<LandmarkIcon size={18} />}
      aside={
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          <Switch
            checked={e.isActive}
            disabled={busy}
            onChange={(_, checked) => onToggle(checked)}
            // role="switch" so screen readers announce an on/off switch, not a checkbox.
            slotProps={{ input: { role: "switch", "aria-label": `${e.name} active` } }}
          />
          <Button
            variant="outlined"
            startIcon={<PencilIcon size={14} />}
            onClick={onEdit}
            aria-label={`Edit ${e.name}`}
          >
            Edit
          </Button>
        </Stack>
      }
    >
      <Stack direction="row" spacing={1}>
        <Chip size="small" variant="outlined" label={e.code} sx={{ fontFamily: "monospace" }} />
      </Stack>

      <Divider sx={{ my: 2.5 }} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))" }, gap: 3 }}>
        <Box component="section" aria-label="Registered address">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", mb: 1 }}>
            <MapPinIcon size={14} />
            <Typography variant="overline" sx={{ lineHeight: 1.4 }}>
              Registered Address
            </Typography>
          </Stack>
          {[e.addressLine1, e.addressLine2, cityLine, e.country].filter(Boolean).map((l) => (
            <Typography key={l} variant="body1">
              {l}
            </Typography>
          ))}
        </Box>
        <Box component="section" aria-label="Registration">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary", mb: 1 }}>
            <BadgeCheckIcon size={14} />
            <Typography variant="overline" sx={{ lineHeight: 1.4 }}>
              Registration
            </Typography>
          </Stack>
          <Stack spacing={0.75}>
            {facts.map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }} color={value ? "text.primary" : "text.disabled"}>
                  {value ?? "—"}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3 }}>
        Last changed {changedText(e.updatedAt, e.updatedByEmail)}
      </Typography>
    </SectionCard>
  );
}
