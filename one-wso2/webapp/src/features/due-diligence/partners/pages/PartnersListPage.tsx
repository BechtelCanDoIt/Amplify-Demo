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

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@wso2/oxygen-ui";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  MoreVerticalIcon,
  PlusCircleIcon,
  RefreshCwIcon,
  SearchIcon,
} from "@wso2/oxygen-ui-icons-react";
import DueDiligenceShell from "@features/due-diligence/components/DueDiligenceShell";
import { DUE_DILIGENCE_EYEBROW } from "@constants/dueDiligenceApps";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import { humanizeHttpError } from "@api/http";
import { usePartners, useRenewPartnerLink } from "../api/usePartners";
import { useCopyClientLink } from "@features/due-diligence/shared/api/useCopyClientLink";
import EditPartnerDialog, { type EditPartnerTarget } from "../dialogs/EditPartnerDialog";
import NewPartnerDialog from "../dialogs/NewPartnerDialog";
import { joinPartnerLinks, type PartnerRow } from "../api/partnerTypes";
import {
  COLUMN_NAMES,
  FILTERS,
  FINANCE_RESULT,
  FORM_STATUS,
  LEGAL_RESULT,
  LINK_STATUS,
  REGION,
  approvalChipColor,
  formStatusChipColor,
  getFormStatusLabel,
  type StatusChipColor,
} from "@features/due-diligence/constants";
import { useDueDiligenceNavigate } from "@features/due-diligence/api/useDueDiligenceNavigate";

type SortColumn = (typeof COLUMN_NAMES)[keyof typeof COLUMN_NAMES];
type SortDirection = "asc" | "desc";

// Ported from the source app's Resellers.js. Filter/sort state is derived
// with useMemo rather than the source's chained setState-in-useEffect
// waterfall — this repo's lint rules (react-hooks/set-state-in-effect)
// forbid that pattern, and useMemo is the direct, race-free equivalent: the
// source's own effects always ran in the same order off the same inputs, so
// nothing about the OUTCOME changes, only how it's computed.
export default function PartnersListPage() {
  const gate = useDueDiligenceGate();
  const partners = usePartners();
  const renewLink = useRenewPartnerLink();
  const copyClientLink = useCopyClientLink();
  const navigate = useDueDiligenceNavigate();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formStatusFilters, setFormStatusFilters] = useState<Record<string, boolean>>({});
  const [financeApprovalFilters, setFinanceApprovalFilters] = useState<Record<string, boolean>>({});
  const [legalApprovalFilters, setLegalApprovalFilters] = useState<Record<string, boolean>>({});
  const [regionFilters, setRegionFilters] = useState<Record<string, boolean>>({});
  const [sortColumn, setSortColumn] = useState<SortColumn>(COLUMN_NAMES.COMPANY_NAME);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const [formStatusAnchor, setFormStatusAnchor] = useState<HTMLElement | null>(null);
  const [financeApprovalAnchor, setFinanceApprovalAnchor] = useState<HTMLElement | null>(null);
  const [legalApprovalAnchor, setLegalApprovalAnchor] = useState<HTMLElement | null>(null);
  const [regionAnchor, setRegionAnchor] = useState<HTMLElement | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedRow, setSelectedRow] = useState<PartnerRow | null>(null);
  const [editTarget, setEditTarget] = useState<EditPartnerTarget | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const rows = useMemo(() => (partners.data ? joinPartnerLinks(partners.data) : []), [partners.data]);

  // Stage 1 — active/expired vs inactive. The source hides the filter UI
  // entirely while viewing inactive companies, so this is the only stage
  // that applies there.
  const scopedRows = useMemo(
    () =>
      showInactive
        ? rows.filter((r) => r.status === LINK_STATUS.INACTIVE)
        : rows.filter((r) => r.status === LINK_STATUS.ACTIVE || r.status === LINK_STATUS.EXPIRED),
    [rows, showInactive],
  );

  // Stages 2-4 — form status, then finance approval, then legal approval,
  // then region. Each stage is a union of every CHECKED sub-filter (OR
  // within the category) applied to the PREVIOUS stage's result (AND across
  // categories) — a direct port of the four filter blocks in Resellers.js.
  const filteredRows = useMemo(() => {
    if (showInactive) return scopedRows;

    const byFormStatus = unionFilter(formStatusFilters, rows, scopedRows, {
      [FILTERS.SIGNED]: (r) => r.reseller.formStatus === FORM_STATUS.SIGNED && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.COMPLETED]: (r) =>
        (r.reseller.formStatus === FORM_STATUS.COMPLETED || r.reseller.formStatus === FORM_STATUS.EDIT_COMPLETED) &&
        r.status === LINK_STATUS.ACTIVE,
      [FILTERS.DRAFTED]: (r) => r.reseller.formStatus === FORM_STATUS.DRAFTED && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.PENDING]: (r) => r.reseller.formStatus === FORM_STATUS.ACTIVE && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.REQUESTED_TO_EDIT]: (r) =>
        (r.reseller.formStatus === FORM_STATUS.TR_EDIT_REQUESTED ||
          r.reseller.formStatus === FORM_STATUS.FULL_EDIT_REQUESTED) &&
        r.status === LINK_STATUS.ACTIVE,
      [FILTERS.EXPIRED]: (r) => r.status === LINK_STATUS.EXPIRED,
    });

    const byFinance = unionFilter(financeApprovalFilters, byFormStatus, byFormStatus, {
      [FILTERS.APPROVED]: (r) => r.reseller.financeResult === FINANCE_RESULT.APPROVED && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.REJECTED]: (r) => r.reseller.financeResult === FINANCE_RESULT.REJECTED && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.PENDING]: (r) => r.reseller.financeResult === FINANCE_RESULT.PENDING && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.CREATOR_PENDING]: (r) =>
        r.reseller.financeResult === FINANCE_RESULT.CREATOR_PENDING && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.REVIEWER_PENDING]: (r) =>
        r.reseller.financeResult === FINANCE_RESULT.REVIEWER_PENDING && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.APPROVAL_PENDING]: (r) =>
        r.reseller.financeResult === FINANCE_RESULT.APPROVAL_PENDING && r.status === LINK_STATUS.ACTIVE,
    });

    const byLegal = unionFilter(legalApprovalFilters, byFinance, byFinance, {
      [FILTERS.APPROVED]: (r) => r.reseller.legalResult === LEGAL_RESULT.APPROVED && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.REJECTED]: (r) => r.reseller.legalResult === LEGAL_RESULT.REJECTED && r.status === LINK_STATUS.ACTIVE,
      [FILTERS.PENDING]: (r) => r.reseller.legalResult === LEGAL_RESULT.PENDING && r.status === LINK_STATUS.ACTIVE,
    });

    const knownRegions: string[] = [
      REGION.NORTH_AMERICA,
      REGION.LATAM,
      REGION.MIDDLE_EAST,
      REGION.ANZ,
      REGION.UK,
      REGION.EU,
      REGION.ASIA,
      REGION.AFRICA,
    ];
    const byRegion = unionFilter(regionFilters, byLegal, byLegal, {
      [FILTERS.NORTH_AMERICA]: (r) => r.reseller.region?.toLowerCase() === REGION.NORTH_AMERICA,
      [FILTERS.LATAM]: (r) => r.reseller.region?.toLowerCase() === REGION.LATAM,
      [FILTERS.MIDDLE_EAST]: (r) => r.reseller.region?.toLowerCase() === REGION.MIDDLE_EAST,
      [FILTERS.ANZ]: (r) => r.reseller.region?.toLowerCase() === REGION.ANZ,
      [FILTERS.UK]: (r) => r.reseller.region?.toLowerCase() === REGION.UK,
      [FILTERS.EU]: (r) => r.reseller.region?.toLowerCase() === REGION.EU,
      [FILTERS.ASIA]: (r) => r.reseller.region?.toLowerCase() === REGION.ASIA,
      [FILTERS.AFRICA]: (r) => r.reseller.region?.toLowerCase() === REGION.AFRICA,
      [FILTERS.OTHER]: (r) => !knownRegions.includes(r.reseller.region?.toLowerCase() ?? ""),
    });

    return byRegion;
  }, [scopedRows, rows, showInactive, formStatusFilters, financeApprovalFilters, legalApprovalFilters, regionFilters]);

  const searchedRows = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter(
      (r) =>
        (r.reseller.companyName || r.companyName).toLowerCase().includes(q) ||
        r.emails.some((email) => email.toLowerCase().includes(q)) ||
        r.reseller.country.toLowerCase().includes(q),
    );
  }, [filteredRows, search]);

  const sortedRows = useMemo(
    () => sortRows(searchedRows, sortColumn, sortDirection),
    [searchedRows, sortColumn, sortDirection],
  );

  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const activeFilterChips = useMemo(
    () => getActiveFilterChips(formStatusFilters, financeApprovalFilters, legalApprovalFilters, regionFilters),
    [formStatusFilters, financeApprovalFilters, legalApprovalFilters, regionFilters],
  );

  const removeChip = (chip: ActiveFilterChip) => {
    const setters: Record<ActiveFilterChip["category"], typeof setFormStatusFilters> = {
      formStatus: setFormStatusFilters,
      financeApproval: setFinanceApprovalFilters,
      legalApproval: setLegalApprovalFilters,
      region: setRegionFilters,
    };
    setters[chip.category]((prev) => ({ ...prev, [chip.key]: false }));
    setPage(0);
  };

  const toggleFilter = (setter: typeof setFormStatusFilters, key: string) => {
    setter((prev) => ({ ...prev, [key]: !prev[key] }));
    setPage(0);
  };

  const onSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const openRow = (row: PartnerRow) => {
    const openableStatuses: string[] = [
      FORM_STATUS.COMPLETED,
      FORM_STATUS.EDIT_COMPLETED,
      FORM_STATUS.SIGNED,
      FORM_STATUS.DRAFTED,
      FORM_STATUS.TR_DRAFTED,
      FORM_STATUS.PENDING,
      FORM_STATUS.TR_EDIT_REQUESTED,
      FORM_STATUS.FULL_EDIT_REQUESTED,
    ];
    if (openableStatuses.includes(row.reseller.formStatus)) {
      navigate(`/due-diligence/partners/${row.reseller.companyId}/profile`, {
        state: { encodeString: row.encodeString, isTradeReferenceEnabled: row.isTradeReferenceEnabled },
      });
    } else {
      navigate(`/due-diligence/partners/pending/${row.reseller.linkId}`, { state: { row } });
    }
  };

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
    setSelectedRow(null);
  };

  const handleRenew = () => {
    if (!selectedRow) return;
    const linkId = selectedRow.reseller.linkId;
    closeActionMenu();
    renewLink.mutate(linkId, {
      onSuccess: () => setSnack({ open: true, severity: "success", message: "Reseller link renewed successfully" }),
      onError: (err) =>
        setSnack({ open: true, severity: "error", message: `Couldn't renew the link. ${humanizeHttpError(err)}` }),
    });
  };

  const handleCopyLink = () => {
    if (!selectedRow) return;
    const encodeString = selectedRow.encodeString;
    closeActionMenu();
    void copyClientLink.copy("resellerform", encodeString).then(({ ok, message }) => {
      setSnack({ open: true, severity: ok ? "success" : "error", message });
    });
  };

  const handleDownloadCsv = () => {
    downloadPartnersCsv(sortedRows);
  };

  return (
    <DueDiligenceShell
      eyebrow={DUE_DILIGENCE_EYEBROW}
      title="Partners"
      subtitle="Reseller partner applications — review, approve, and track finance/legal sign-off."
    >
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        {(gate.hasRole("adminRole") ||
          gate.hasRole("channelManager") ||
          gate.hasRole("financeRole") ||
          gate.hasRole("legalRole")) && (
          <Button
            variant="contained"
            startIcon={<PlusCircleIcon size={16} />}
            sx={{ textTransform: "none" }}
            onClick={() => setNewDialogOpen(true)}
          >
            Request Due Diligence
          </Button>
        )}
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setPage(0);
              }}
            />
          }
          label={<Typography variant="body2">Show inactive companies</Typography>}
        />
        <TextField
          size="small"
          placeholder="Search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          slotProps={{ input: { startAdornment: <SearchIcon size={16} style={{ marginRight: 6 }} /> } }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <Button
          variant="outlined"
          startIcon={<DownloadIcon size={16} />}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          onClick={handleDownloadCsv}
        >
          Download CSV
        </Button>
      </Stack>

      {!showInactive && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              endIcon={<ChevronDownIcon size={14} />}
              onClick={(e) => setFormStatusAnchor(e.currentTarget)}
              sx={{ textTransform: "none", borderColor: "text.primary", color: "text.primary" }}
            >
              Form Status
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              endIcon={<ChevronDownIcon size={14} />}
              onClick={(e) => setFinanceApprovalAnchor(e.currentTarget)}
              sx={{ textTransform: "none", borderColor: "text.primary", color: "text.primary" }}
            >
              Finance Approval
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              endIcon={<ChevronDownIcon size={14} />}
              onClick={(e) => setLegalApprovalAnchor(e.currentTarget)}
              sx={{ textTransform: "none", borderColor: "text.primary", color: "text.primary" }}
            >
              Legal Approval
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              endIcon={<ChevronDownIcon size={14} />}
              onClick={(e) => setRegionAnchor(e.currentTarget)}
              sx={{ textTransform: "none", borderColor: "text.primary", color: "text.primary" }}
            >
              Region
            </Button>
          </Stack>

          {activeFilterChips.length > 0 && (
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
              {activeFilterChips.map((chip) => (
                <Chip
                  key={`${chip.category}-${chip.key}`}
                  label={chip.label}
                  size="small"
                  variant="outlined"
                  onDelete={() => removeChip(chip)}
                />
              ))}
            </Stack>
          )}

          <FilterMenu
            anchor={formStatusAnchor}
            onClose={() => setFormStatusAnchor(null)}
            options={[
              [FILTERS.SIGNED, "Completed"],
              [FILTERS.COMPLETED, "Pending Signature"],
              [FILTERS.DRAFTED, "Drafted"],
              [FILTERS.PENDING, "Pending"],
              [FILTERS.REQUESTED_TO_EDIT, "Requested to Edit"],
              [FILTERS.EXPIRED, "Expired"],
            ]}
            checked={formStatusFilters}
            onToggle={(key) => toggleFilter(setFormStatusFilters, key)}
          />
          <FilterMenu
            anchor={financeApprovalAnchor}
            onClose={() => setFinanceApprovalAnchor(null)}
            options={[
              [FILTERS.APPROVED, "Approved"],
              [FILTERS.REJECTED, "Rejected"],
              [FILTERS.PENDING, "Pending"],
              [FILTERS.CREATOR_PENDING, "Creator Pending"],
              [FILTERS.REVIEWER_PENDING, "Reviewer Pending"],
              [FILTERS.APPROVAL_PENDING, "Approval Pending"],
            ]}
            checked={financeApprovalFilters}
            onToggle={(key) => toggleFilter(setFinanceApprovalFilters, key)}
          />
          <FilterMenu
            anchor={legalApprovalAnchor}
            onClose={() => setLegalApprovalAnchor(null)}
            options={[
              [FILTERS.APPROVED, "Approved"],
              [FILTERS.REJECTED, "Rejected"],
              [FILTERS.PENDING, "Pending"],
            ]}
            checked={legalApprovalFilters}
            onToggle={(key) => toggleFilter(setLegalApprovalFilters, key)}
          />
          <FilterMenu
            anchor={regionAnchor}
            onClose={() => setRegionAnchor(null)}
            options={[
              [FILTERS.NORTH_AMERICA, "North America"],
              [FILTERS.LATAM, "LATAM"],
              [FILTERS.MIDDLE_EAST, "Middle East"],
              [FILTERS.ANZ, "ANZ"],
              [FILTERS.UK, "UK"],
              [FILTERS.EU, "EU"],
              [FILTERS.ASIA, "Asia"],
              [FILTERS.AFRICA, "Africa"],
              [FILTERS.OTHER, "Other"],
            ]}
            checked={regionFilters}
            onToggle={(key) => toggleFilter(setRegionFilters, key)}
          />
        </Box>
      )}

      <Menu anchorEl={actionMenuAnchor} open={Boolean(actionMenuAnchor)} onClose={closeActionMenu}>
        <MenuItem onClick={handleRenew}>
          <RefreshCwIcon size={15} style={{ marginRight: 10 }} />
          Renew Link
        </MenuItem>
        <MenuItem onClick={handleCopyLink}>
          <CopyIcon size={15} style={{ marginRight: 10 }} />
          Copy Link
        </MenuItem>
        <MenuItem
          disabled={
            !(selectedRow?.reseller.formStatus === FORM_STATUS.ACTIVE && selectedRow?.status !== LINK_STATUS.EXPIRED)
          }
          onClick={() => {
            if (!selectedRow) return;
            setEditTarget({
              linkId: selectedRow.reseller.linkId,
              companyName: selectedRow.reseller.companyName || selectedRow.companyName,
              emails: selectedRow.emails,
              contactName: selectedRow.contactName,
              channelManagerEmail: selectedRow.channelManagerEmail,
            });
            closeActionMenu();
          }}
        >
          <EditIcon size={15} style={{ marginRight: 10 }} />
          Edit Details
        </MenuItem>
      </Menu>

      {editTarget && (
        <EditPartnerDialog
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            setSnack({ open: true, severity: "success", message: "Success" });
          }}
        />
      )}

      {newDialogOpen && (
        <NewPartnerDialog
          onClose={() => setNewDialogOpen(false)}
          onCreated={() => {
            setNewDialogOpen(false);
            setSnack({ open: true, severity: "success", message: "Success" });
          }}
        />
      )}

      {partners.isError ? (
        <Alert severity="error">Couldn't load partners. {humanizeHttpError(partners.error)}</Alert>
      ) : (
        <>
          {/* Auto layout, not fixed: a fixed percentage split couldn't tell
              "Company Name" (safe to truncate) apart from "Requested To Edit"
              (must show in full) — every column ended up fighting over the
              same slice regardless of what it actually held. Auto layout
              sizes each column to its own content instead; only the columns
              capped with `maxWidth` below (name/emails/country/region) give
              up space, so the status chips always render whole. */}
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableHeaderCell column={COLUMN_NAMES.COMPANY_NAME} current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Company Name
                  </SortableHeaderCell>
                  <SortableHeaderCell column={COLUMN_NAMES.CONTACT_EMAIL} current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Contact Email
                  </SortableHeaderCell>
                  <SortableHeaderCell
                    column={COLUMN_NAMES.CHANNEL_MANAGER_EMAIL}
                    current={sortColumn}
                    direction={sortDirection}
                    onSort={onSort}
                  >
                    Channel Manager Email
                  </SortableHeaderCell>
                  <SortableHeaderCell column={COLUMN_NAMES.COUNTRY} current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Country
                  </SortableHeaderCell>
                  <SortableHeaderCell column={COLUMN_NAMES.REGION} current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Region
                  </SortableHeaderCell>
                  <TableCell align="left" sx={{ whiteSpace: "nowrap" }}>Form Status</TableCell>
                  <TableCell align="left" sx={{ whiteSpace: "nowrap" }}>Finance Approval</TableCell>
                  <TableCell align="left" sx={{ whiteSpace: "nowrap" }}>Legal Approval</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {partners.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <PartnerSkeletonRow key={`skeleton-${i}`} />)
                ) : pagedRows.map((row) => {
                  const formStatusLabel = getFormStatusLabel(row.reseller.formStatus, row.status);
                  return (
                    <TableRow key={row.linkId} hover onClick={() => openRow(row)} sx={{ cursor: "pointer" }}>
                      <TableCell align="left" sx={{ maxWidth: 150 }}>
                        <TruncatedText value={row.reseller.companyName || row.companyName} />
                      </TableCell>
                      <TableCell align="left" sx={{ maxWidth: 160 }}>
                        <TruncatedText value={row.emails.join(", ")} />
                      </TableCell>
                      <TableCell align="left" sx={{ maxWidth: 200 }}>
                        <TruncatedText value={row.channelManagerEmail} />
                      </TableCell>
                      <TableCell align="left" sx={{ maxWidth: 140 }}>
                        <TruncatedText value={row.reseller.country} />
                      </TableCell>
                      <TableCell align="left" sx={{ maxWidth: 120 }}>
                        <TruncatedText value={row.reseller.region || "-"} />
                      </TableCell>
                      <TableCell align="left" sx={{ whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        <ResultCell
                          label={formStatusLabel}
                          date={
                            row.reseller.formStatus === FORM_STATUS.SIGNED ? row.reseller.signedDocumentUpdatedOn : undefined
                          }
                          color={formStatusChipColor(formStatusLabel)}
                        />
                      </TableCell>
                      <TableCell align="left" sx={{ whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        <ResultCell
                          label={row.reseller.financeResult}
                          date={
                            row.reseller.financeResult === FINANCE_RESULT.APPROVED ||
                            row.reseller.financeResult === FINANCE_RESULT.REJECTED
                              ? row.reseller.financeResultUpdatedOn
                              : undefined
                          }
                          color={approvalChipColor(row.reseller.financeResult)}
                        />
                      </TableCell>
                      <TableCell align="left" sx={{ whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        <ResultCell
                          label={row.reseller.legalResult}
                          date={
                            row.reseller.legalResult === LEGAL_RESULT.APPROVED ||
                            row.reseller.legalResult === LEGAL_RESULT.REJECTED
                              ? row.reseller.legalResultUpdatedOn
                              : undefined
                          }
                          color={approvalChipColor(row.reseller.legalResult)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Show Actions">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuAnchor(e.currentTarget);
                              setSelectedRow(row);
                            }}
                          >
                            <MoreVerticalIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {!partners.isLoading && sortedRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 3 }}>
              No partners found.
            </Typography>
          )}
          {!partners.isLoading && (
            <TablePagination
              component="div"
              rowsPerPageOptions={[5, 10, 25]}
              count={sortedRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          )}
        </>
      )}
    </DueDiligenceShell>
  );
}

// One loading placeholder row, shaped like a real one — the header stays put
// and the table doesn't jump when data lands, unlike a spinner that replaces
// the whole section. Mirrors the real row's own column shapes: text cells get
// a text-shaped skeleton, the three chip cells get a rounded one, Actions
// gets a circular one (the icon button it will become).
function PartnerSkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton variant="text" width="70%" /></TableCell>
      <TableCell><Skeleton variant="text" width="80%" /></TableCell>
      <TableCell><Skeleton variant="text" width="80%" /></TableCell>
      <TableCell><Skeleton variant="text" width="60%" /></TableCell>
      <TableCell><Skeleton variant="text" width="50%" /></TableCell>
      <TableCell><Skeleton variant="rounded" width={90} height={22} /></TableCell>
      <TableCell><Skeleton variant="rounded" width={90} height={22} /></TableCell>
      <TableCell><Skeleton variant="rounded" width={90} height={22} /></TableCell>
      <TableCell align="center"><Skeleton variant="circular" width={24} height={24} sx={{ mx: "auto" }} /></TableCell>
    </TableRow>
  );
}

// A cell value that would otherwise wrap onto a second line (a long company
// name, a comma-joined list of emails, ...) truncates to one line with an
// ellipsis instead — the full value is still available on hover. Deliberately
// NOT used for ResultCell's chip+date: the date underneath "Completed" is
// short, never wraps on its own, and truncating it would just hide it.
function TruncatedText({ value }: { value: string }) {
  return (
    <Tooltip title={value}>
      <Typography variant="body2" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </Typography>
    </Tooltip>
  );
}

function ResultCell({ label, date, color }: { label: string; date?: string | null; color?: StatusChipColor }) {
  return (
    <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
      <Chip label={label} size="small" variant="outlined" color={color ?? "default"} />
      {date && (
        <Typography variant="caption" color="text.secondary">
          {new Date(date).toLocaleDateString()}
        </Typography>
      )}
    </Stack>
  );
}

function SortableHeaderCell({
  column,
  current,
  direction,
  onSort,
  children,
}: {
  column: SortColumn;
  current: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  children: React.ReactNode;
}) {
  const isActive = current === column;
  return (
    <TableCell
      align="left"
      onClick={() => onSort(column)}
      sx={{ cursor: "pointer", fontWeight: isActive ? 700 : 400, whiteSpace: "nowrap" }}
    >
      <Stack direction="row" spacing={0.25} sx={{ alignItems: "center", justifyContent: "flex-start" }}>
        <span>{children}</span>
        {isActive && (direction === "asc" ? <ArrowUpIcon size={13} /> : <ArrowDownIcon size={13} />)}
      </Stack>
    </TableCell>
  );
}

function FilterMenu({
  anchor,
  onClose,
  options,
  checked,
  onToggle,
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  options: [string, string][];
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={onClose}>
      {options.map(([key, label]) => (
        <MenuItem key={key} onClick={() => onToggle(key)} dense>
          <Checkbox checked={Boolean(checked[key])} size="small" />
          {label}
        </MenuItem>
      ))}
    </Menu>
  );
}

interface ActiveFilterChip {
  category: "formStatus" | "financeApproval" | "legalApproval" | "region";
  key: string;
  label: string;
}

function getActiveFilterChips(
  formStatus: Record<string, boolean>,
  finance: Record<string, boolean>,
  legal: Record<string, boolean>,
  region: Record<string, boolean>,
): ActiveFilterChip[] {
  const labels: Record<ActiveFilterChip["category"], Record<string, string>> = {
    formStatus: {
      [FILTERS.SIGNED]: "Status: Completed",
      [FILTERS.COMPLETED]: "Status: Pending Signature",
      [FILTERS.DRAFTED]: "Status: Drafted",
      [FILTERS.PENDING]: "Status: Pending",
      [FILTERS.REQUESTED_TO_EDIT]: "Status: Requested to Edit",
      [FILTERS.EXPIRED]: "Status: Expired",
    },
    financeApproval: {
      [FILTERS.APPROVED]: "Finance: Approved",
      [FILTERS.REJECTED]: "Finance: Rejected",
      [FILTERS.PENDING]: "Finance: Pending",
      [FILTERS.CREATOR_PENDING]: "Finance: Creator Pending",
      [FILTERS.REVIEWER_PENDING]: "Finance: Reviewer Pending",
      [FILTERS.APPROVAL_PENDING]: "Finance: Approval Pending",
    },
    legalApproval: {
      [FILTERS.APPROVED]: "Legal: Approved",
      [FILTERS.REJECTED]: "Legal: Rejected",
      [FILTERS.PENDING]: "Legal: Pending",
    },
    region: {
      [FILTERS.NORTH_AMERICA]: "Region: North America",
      [FILTERS.LATAM]: "Region: LATAM",
      [FILTERS.MIDDLE_EAST]: "Region: Middle East",
      [FILTERS.ANZ]: "Region: ANZ",
      [FILTERS.UK]: "Region: UK",
      [FILTERS.EU]: "Region: EU",
      [FILTERS.ASIA]: "Region: Asia",
      [FILTERS.AFRICA]: "Region: Africa",
      [FILTERS.OTHER]: "Region: Other",
    },
  };
  const chips: ActiveFilterChip[] = [];
  const sources: [ActiveFilterChip["category"], Record<string, boolean>][] = [
    ["formStatus", formStatus],
    ["financeApproval", finance],
    ["legalApproval", legal],
    ["region", region],
  ];
  for (const [category, values] of sources) {
    for (const [key, isOn] of Object.entries(values)) {
      if (isOn) chips.push({ category, key, label: labels[category][key] });
    }
  }
  return chips;
}

/**
 * Union of every checked sub-filter's matches, applied against `source`
 * (each predicate independently decides inclusion — see the filter blocks
 * this is extracted from in Resellers.js). Falls back to `passthrough` when
 * nothing in this category is checked, matching the source's
 * "no filter selected → show everything from the previous stage" behaviour.
 */
function unionFilter(
  active: Record<string, boolean>,
  source: PartnerRow[],
  passthrough: PartnerRow[],
  predicates: Record<string, (row: PartnerRow) => boolean>,
): PartnerRow[] {
  const checkedKeys = Object.keys(active).filter((k) => active[k]);
  if (checkedKeys.length === 0) return passthrough;
  const matched = new Set<PartnerRow>();
  for (const key of checkedKeys) {
    const predicate = predicates[key];
    if (!predicate) continue;
    for (const row of source) {
      if (predicate(row)) matched.add(row);
    }
  }
  return source.filter((row) => matched.has(row));
}

function sortRows(rows: PartnerRow[], column: SortColumn, direction: SortDirection): PartnerRow[] {
  const key: ((r: PartnerRow) => string) | undefined = {
    [COLUMN_NAMES.COMPANY_NAME]: (r: PartnerRow) => r.reseller.companyName,
    [COLUMN_NAMES.CONTACT_EMAIL]: (r: PartnerRow) => r.emails[0] ?? "",
    [COLUMN_NAMES.CHANNEL_MANAGER_EMAIL]: (r: PartnerRow) => r.channelManagerEmail ?? "",
    [COLUMN_NAMES.COUNTRY]: (r: PartnerRow) => r.reseller.country,
    [COLUMN_NAMES.REGION]: (r: PartnerRow) => r.reseller.region ?? "",
    [COLUMN_NAMES.FORM_STATUS]: (r: PartnerRow) => r.reseller.formStatus,
    [COLUMN_NAMES.FINANCE_APPROVAL]: (r: PartnerRow) => r.reseller.financeResult,
    [COLUMN_NAMES.LEGAL_APPROVAL]: (r: PartnerRow) => r.reseller.legalResult,
  }[column];
  if (!key) return rows;
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => key(a).toLowerCase().localeCompare(key(b).toLowerCase()) * sign);
}

function downloadPartnersCsv(rows: PartnerRow[]) {
  const escape = (val: unknown): string => {
    const str = val == null ? "" : String(val);
    const sanitized = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")
      ? `"${sanitized.replace(/"/g, '""')}"`
      : sanitized;
  };
  const headers = Object.values(COLUMN_NAMES);
  const csvRows = rows.map((r) =>
    [
      escape(r.reseller.companyName),
      escape((r.emails || []).join("; ")),
      escape(r.channelManagerEmail),
      escape(r.reseller.country),
      escape(r.reseller.region),
      escape(getFormStatusLabel(r.reseller.formStatus, r.status)),
      escape(r.reseller.financeResult),
      escape(r.reseller.legalResult),
    ].join(","),
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resellers.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
