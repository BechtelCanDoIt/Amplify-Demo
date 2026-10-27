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

// Ports promotion-app's own
// view/promotionCycleHistory/panels/peopleHrArchive.tsx — read-only view of
// promotions migrated out of People HR, before HRIS. A person can
// legitimately appear both here and as a real promotion request elsewhere
// in the app (this is one source's own record, not merged with the rest),
// which is why this is its own archive rather than folded into the
// PromotionTimeline the rest of the app uses.
import { useEffect, useState } from "react";
import {
  AdapterDateFns,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  DataGrid,
  DatePickers,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { ArchiveIcon, TrendingUpIcon, XIcon } from "@wso2/oxygen-ui-icons-react";
import { humanizeHttpError } from "@api/http";
import { usePromotionArchive } from "../api/usePromotionArchive";
import PromotionEmptyState from "../components/PromotionEmptyState";
import { PromotionGridToolbar } from "../components/PromotionGridToolbar";
import { GRID_NO_POINTER_FOCUS_SX } from "@utils/dataGridSx";
import type { ArchivedPromotion } from "../api/types";

const { DatePicker, LocalizationProvider } = DatePickers;

function TypeChip({ inBand }: { inBand: boolean }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={inBand ? "In-band" : "Normal"}
      icon={inBand ? <TrendingUpIcon size={14} /> : undefined}
    />
  );
}

function toDateOnly(d: Date | null): string | undefined {
  if (!d) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PeopleHrArchiveTab() {
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [person, setPerson] = useState<ArchivedPromotion | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedName(nameFilter), 350);
    return () => clearTimeout(timer);
  }, [nameFilter]);

  const rangeInvalid = Boolean(from && to && from > to);
  const archive = usePromotionArchive(
    { search: debouncedName.trim() || undefined, startDate: toDateOnly(from), endDate: toDateOnly(to) },
    !rangeInvalid,
  );
  const personArchive = usePromotionArchive({ employeeEmail: person?.email }, Boolean(person));

  const rows = archive.data?.promotionHistory ?? [];
  const people = new Set(rows.map((r) => r.email)).size;
  const filtered = Boolean(debouncedName.trim() || from || to);

  const columns: DataGrid.GridColDef<ArchivedPromotion>[] = [
    {
      display: "flex",
      field: "firstName",
      headerName: "Employee",
      flex: 1,
      minWidth: 160,
      renderCell: (params) => (
        <Button size="small" onClick={() => setPerson(params.row)}>
          {params.row.firstName} {params.row.lastName}
        </Button>
      ),
    },
    { field: "email", headerName: "Email", flex: 1.2, minWidth: 200 },
    { field: "promotedDesignation", headerName: "Promoted Designation", flex: 1.2, minWidth: 200 },
    {
      display: "flex",
      field: "inBand",
      headerName: "Type",
      flex: 0.6,
      minWidth: 110,
      renderCell: (params) => <TypeChip inBand={params.value} />,
    },
    { field: "promotionEffectiveDate", headerName: "Effective Date", flex: 0.8, minWidth: 140 },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mb: 2 }}>
        <Alert severity="info" icon={<ArchiveIcon size={18} />}>
          Promotions as recorded in <strong>People HR</strong>, before HRIS. This is an archive of
          that one source and is read-only — a promotion listed here may also appear as a
          promotion request elsewhere in the app.
        </Alert>
      </Box>

      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField
          size="small"
          sx={{ minWidth: 260 }}
          label="Filter by name or email"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
        <DatePicker
          label="Effective from"
          value={from}
          onChange={(d: Date | null) => setFrom(d)}
          slotProps={{ textField: { size: "small" } }}
        />
        <DatePicker
          label="Effective to"
          value={to}
          minDate={from ?? undefined}
          onChange={(d: Date | null) => setTo(d)}
          slotProps={{
            textField: { size: "small", error: rangeInvalid, helperText: rangeInvalid ? "'To' is before 'from'" : undefined },
          }}
        />
        {filtered && (
          <Button
            size="small"
            startIcon={<XIcon size={14} />}
            onClick={() => {
              setNameFilter("");
              setDebouncedName("");
              setFrom(null);
              setTo(null);
            }}
            sx={{ mt: 0.5 }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      {rangeInvalid ? (
        // The query is disabled while the range is invalid, so archive.isPending
        // would otherwise stay true forever — checked before it, ahead of the
        // Skeleton, rather than leaving the "'To' is before 'from'" field-level
        // helper text as the only explanation for a permanently-loading panel.
        <PromotionEmptyState
          tone="warning"
          message="'To' is before 'from' — fix the date range to see results."
        />
      ) : archive.isPending ? (
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 1 }} />
      ) : archive.isError ? (
        <PromotionEmptyState
          tone="error"
          message={`Unable to load the archived promotions. ${humanizeHttpError(archive.error)}`}
        />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {rows.length === 0
              ? "0 records"
              : `${rows.length} record${rows.length === 1 ? "" : "s"} · ${people} employee${people === 1 ? "" : "s"}`}
            {filtered && " (filtered)"}
          </Typography>
          {rows.length === 0 ? (
            <PromotionEmptyState message="No archived promotions match these filters." />
          ) : (
            <Card variant="outlined" sx={{ p: 2 }}>
              <DataGrid.DataGrid
                rows={rows}
                getRowId={(row) => `${row.email}-${row.promotionEffectiveDate}-${row.promotedDesignation}`}
                columns={columns}
                showToolbar
                slots={{ toolbar: PromotionGridToolbar }}
                sx={{ border: "none", ...GRID_NO_POINTER_FOCUS_SX }}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                pageSizeOptions={[25, 50, 100]}
              />
            </Card>
          )}
        </>
      )}

      <Dialog open={Boolean(person)} onClose={() => setPerson(null)} fullWidth maxWidth="sm">
        {person && (
          <>
            <DialogTitle sx={{ pr: 6 }}>
              Promotion History – {person.firstName} {person.lastName}
              <Typography variant="caption" component="div" color="text.secondary">
                {person.email} · People HR id {person.employeeId} · full archived history
              </Typography>
              <IconButton onClick={() => setPerson(null)} sx={{ position: "absolute", right: 12, top: 12 }} size="small">
                <XIcon size={16} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {personArchive.isPending ? (
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
              ) : personArchive.isError ? (
                <Typography variant="body2" color="error" sx={{ py: 2 }}>
                  We could not load this employee&apos;s history. Please try again.
                </Typography>
              ) : (personArchive.data?.promotionHistory.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  0 records.
                </Typography>
              ) : (
                <>
                  <Typography variant="caption" color="text.secondary">
                    {personArchive.data?.promotionHistory.length} archived promotion
                    {personArchive.data?.promotionHistory.length === 1 ? "" : "s"}
                  </Typography>
                  <Divider sx={{ mt: 1, mb: 1.5 }} />
                  <Stack spacing={0}>
                    {personArchive.data?.promotionHistory.map((row, index) => (
                      <Box key={`${row.promotionEffectiveDate}-${row.promotedDesignation}`} sx={{ display: "flex", gap: 2 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              bgcolor: "action.selected",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {row.inBand ? <TrendingUpIcon size={14} /> : <ArchiveIcon size={14} />}
                          </Box>
                          {index !== (personArchive.data?.promotionHistory.length ?? 0) - 1 && (
                            <Box sx={{ width: 2, flex: 1, bgcolor: "divider", minHeight: 24 }} />
                          )}
                        </Box>
                        <Box sx={{ pb: 2.5 }}>
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                            {row.promotionEffectiveDate}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.promotedDesignation}</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <TypeChip inBand={row.inBand} />
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </LocalizationProvider>
  );
}
