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
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
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
  Typography,
} from "@wso2/oxygen-ui";
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, RefreshCwIcon, SearchIcon } from "@wso2/oxygen-ui-icons-react";
import DueDiligenceShell from "@features/due-diligence/components/DueDiligenceShell";
import { DUE_DILIGENCE_EYEBROW } from "@constants/dueDiligenceApps";
import { useDueDiligenceGate } from "@features/due-diligence/api/useDueDiligenceGate";
import { humanizeHttpError } from "@api/http";
import { useRenewTradeReferenceLink, useTradeReferences } from "../api/useTradeReferences";
import { useCopyClientLink } from "@features/due-diligence/shared/api/useCopyClientLink";
import { joinTradeReferenceLinks, type TradeReferenceRow } from "../api/tradeReferenceTypes";
import { TRADE_REFERENCE_STATUS, tradeReferenceStatusChipColor } from "@features/due-diligence/constants";
import { useDueDiligenceNavigate } from "@features/due-diligence/api/useDueDiligenceNavigate";

type SortColumn = "Partner Company" | "Reference Company" | "Contact Email" | "Form Status";
type SortDirection = "asc" | "desc";

const STATUS_LABEL: Record<string, string> = {
  [TRADE_REFERENCE_STATUS.COMPLETED]: TRADE_REFERENCE_STATUS.COMPLETED,
  pending: TRADE_REFERENCE_STATUS.PENDING, // stored "pending" → shown "requested to edit"
  [TRADE_REFERENCE_STATUS.DRAFTED]: TRADE_REFERENCE_STATUS.DRAFTED,
  [TRADE_REFERENCE_STATUS.DEACTIVATED]: TRADE_REFERENCE_STATUS.DEACTIVATED,
  [TRADE_REFERENCE_STATUS.REJECTED]: TRADE_REFERENCE_STATUS.REJECTED,
  active: TRADE_REFERENCE_STATUS.ACTIVE, // stored "active" → shown "pending"
};


// Ported from the source app's TradeReferences.js.
export default function TradeReferencesListPage() {
  const gate = useDueDiligenceGate();
  const tradeReferences = useTradeReferences();
  const renewLink = useRenewTradeReferenceLink();
  const copyClientLink = useCopyClientLink();
  const navigate = useDueDiligenceNavigate();

  const [search, setSearch] = useState("");
  // Defaults ALL checked, unlike Partners' filters — matches the source's own
  // initial state (formStatusFilters: { completed: true, drafted: true, ... }).
  const [formStatusFilters, setFormStatusFilters] = useState<Record<string, boolean>>({
    completed: true,
    drafted: true,
    pending: true,
    rejected: true,
    deactivated: true,
  });
  const [sortColumn, setSortColumn] = useState<SortColumn>("Partner Company");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snack, setSnack] = useState<{ open: boolean; severity: "success" | "error"; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const rows = useMemo(
    () => (tradeReferences.data ? joinTradeReferenceLinks(tradeReferences.data) : []),
    [tradeReferences.data],
  );

  // A row's status maps to one of five checkboxes — "pending" (stored) means
  // "requested to edit" and "active" (stored) means the open/default state;
  // see STATUS_LABEL above for the same stored→shown mapping the table cell
  // uses. Unlike Partners, there is no "nothing checked → show everything"
  // fallback here: the source shows an EMPTY list when every filter is off,
  // and this keeps that behaviour rather than inventing a friendlier one.
  const filteredRows = useMemo(() => {
    const matched = new Set<TradeReferenceRow>();
    if (formStatusFilters.completed) {
      for (const r of rows) if (r.status === TRADE_REFERENCE_STATUS.COMPLETED) matched.add(r);
    }
    if (formStatusFilters.drafted) {
      for (const r of rows) if (r.status === TRADE_REFERENCE_STATUS.DRAFTED) matched.add(r);
    }
    if (formStatusFilters.pending) {
      for (const r of rows) if (r.status === "active") matched.add(r);
    }
    if (formStatusFilters.deactivated) {
      for (const r of rows) if (r.status === TRADE_REFERENCE_STATUS.DEACTIVATED) matched.add(r);
    }
    if (formStatusFilters.rejected) {
      for (const r of rows) if (r.status === TRADE_REFERENCE_STATUS.REJECTED) matched.add(r);
    }
    return rows.filter((r) => matched.has(r));
  }, [rows, formStatusFilters]);

  const searchedRows = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter(
      (r) =>
        r.companyName.toLowerCase().includes(q) ||
        r.resellerCompanyName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }, [filteredRows, search]);

  const sortedRows = useMemo(() => {
    const key: ((r: TradeReferenceRow) => string) | undefined = {
      "Partner Company": (r: TradeReferenceRow) => r.resellerCompanyName,
      "Reference Company": (r: TradeReferenceRow) => r.companyName,
      "Contact Email": (r: TradeReferenceRow) => r.email,
      "Form Status": (r: TradeReferenceRow) => r.status,
    }[sortColumn];
    if (!key) return searchedRows;
    const sign = sortDirection === "asc" ? 1 : -1;
    return [...searchedRows].sort((a, b) => key(a).toLowerCase().localeCompare(key(b).toLowerCase()) * sign);
  }, [searchedRows, sortColumn, sortDirection]);

  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const onSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // NOTE: `TRADE_REFERENCE_STATUS.ACTIVE` holds the DISPLAY string ("pending"),
  // not the stored one ("active" — see the constant's own comment), so this
  // third comparison never actually matches a stored-active row. That is a
  // faithful, deliberate port of the source's own TradeReferences.js
  // `openRow` (same constant, same three-way comparison, same quirk) — not a
  // bug introduced here. It's harmless in practice: a stored-active row falls
  // through to the final `else` below, which is the Pending page anyway —
  // the correct destination for a form that hasn't been submitted yet.
  const openRow = (row: TradeReferenceRow) => {
    if (
      row.status === TRADE_REFERENCE_STATUS.COMPLETED ||
      row.status === TRADE_REFERENCE_STATUS.DRAFTED ||
      row.status === TRADE_REFERENCE_STATUS.ACTIVE
    ) {
      navigate(`/due-diligence/trade-references/${row.companyId}/${row.linkId}`, {
        state: { encodeString: row.encodeString },
      });
    } else if (row.status === TRADE_REFERENCE_STATUS.DEACTIVATED) {
      navigate(`/due-diligence/trade-references/deactivated/${row.linkId}`, {
        state: { row, encodeString: row.encodeString },
      });
    } else if (row.status === TRADE_REFERENCE_STATUS.REJECTED) {
      navigate(`/due-diligence/trade-references/rejected/${row.companyId}/${row.linkId}`, {
        state: { row, encodeString: row.encodeString },
      });
    } else {
      navigate(`/due-diligence/trade-references/pending/${row.linkId}`, {
        state: { row, encodeString: row.encodeString },
      });
    }
  };

  const handleRenew = (linkId: number) => {
    renewLink.mutate(linkId, {
      onSuccess: () =>
        setSnack({ open: true, severity: "success", message: "Trade reference link renewed successfully" }),
      onError: (err) =>
        setSnack({ open: true, severity: "error", message: `Couldn't renew the link. ${humanizeHttpError(err)}` }),
    });
  };

  const handleCopy = (encodeString: string) => {
    void copyClientLink.copy("tradereferenceform", encodeString).then(({ ok, message }) => {
      setSnack({ open: true, severity: ok ? "success" : "error", message });
    });
  };

  const canCopy = gate.hasRole("adminRole") || gate.hasRole("channelManager") || gate.hasRole("financeRole") || gate.hasRole("legalRole");

  return (
    <DueDiligenceShell
      eyebrow={DUE_DILIGENCE_EYEBROW}
      title="Trade References"
      subtitle="Trade reference requests and their review status."
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

      <TextField
        size="small"
        placeholder="Search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        slotProps={{ input: { startAdornment: <SearchIcon size={16} style={{ marginRight: 6 }} /> } }}
        sx={{ mb: 2, minWidth: 260 }}
      />

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="body2" sx={{ mr: 1 }}>
          Form Status:
        </Typography>
        {(["completed", "drafted", "pending", "deactivated", "rejected"] as const).map((key) => (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                size="small"
                checked={Boolean(formStatusFilters[key])}
                onChange={(e) => setFormStatusFilters((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            }
            label={<Typography variant="body2">{capitalize(key)}</Typography>}
          />
        ))}
      </Stack>

      {tradeReferences.isError ? (
        <Alert severity="error">Couldn't load trade references. {humanizeHttpError(tradeReferences.error)}</Alert>
      ) : (
        <>
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableHeaderCell column="Partner Company" current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Partner Company
                  </SortableHeaderCell>
                  <SortableHeaderCell column="Reference Company" current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Reference Company
                  </SortableHeaderCell>
                  <SortableHeaderCell column="Contact Email" current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Contact Email
                  </SortableHeaderCell>
                  <SortableHeaderCell column="Form Status" current={sortColumn} direction={sortDirection} onSort={onSort}>
                    Form Status
                  </SortableHeaderCell>
                  <TableCell align="center">Renew Link</TableCell>
                  <TableCell align="center">Copy URL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tradeReferences.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <TradeReferenceSkeletonRow key={`skeleton-${i}`} />)
                ) : pagedRows.map((row) => (
                  <TableRow key={row.linkId} hover onClick={() => openRow(row)} sx={{ cursor: "pointer" }}>
                    <TableCell align="left">{row.resellerCompanyName}</TableCell>
                    <TableCell align="left">{row.companyName}</TableCell>
                    <TableCell align="left">{row.email}</TableCell>
                    <TableCell align="left" sx={{ textTransform: "capitalize" }}>
                      <Chip
                        label={STATUS_LABEL[row.status] ?? TRADE_REFERENCE_STATUS.DEFAULT}
                        size="small"
                        variant="outlined"
                        color={tradeReferenceStatusChipColor(row.status)}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenew(row.linkId);
                        }}
                      >
                        <RefreshCwIcon size={16} />
                      </IconButton>
                    </TableCell>
                    <TableCell align="center">
                      {canCopy && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(row.encodeString);
                          }}
                        >
                          <CopyIcon size={16} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!tradeReferences.isLoading && sortedRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 3 }}>
              No trade references found.
            </Typography>
          )}
          {!tradeReferences.isLoading && (
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Mirrors the real row's column shapes — text cells get a text-shaped
// skeleton, Form Status gets a rounded one, the two icon-button columns get
// circular ones — so the header stays put and nothing jumps when data lands.
function TradeReferenceSkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton variant="text" width="70%" /></TableCell>
      <TableCell><Skeleton variant="text" width="70%" /></TableCell>
      <TableCell><Skeleton variant="text" width="80%" /></TableCell>
      <TableCell><Skeleton variant="rounded" width={100} height={22} /></TableCell>
      <TableCell align="center"><Skeleton variant="circular" width={24} height={24} sx={{ mx: "auto" }} /></TableCell>
      <TableCell align="center"><Skeleton variant="circular" width={24} height={24} sx={{ mx: "auto" }} /></TableCell>
    </TableRow>
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
