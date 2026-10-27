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

import { useRef, useState } from "react";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
} from "@wso2/oxygen-ui";
import { FilterIcon } from "@wso2/oxygen-ui-icons-react";
import { opdStatusMeta } from "../../components/FinanceChips";
import {
  emptyOpdHistoryFilters,
  opdPeriodLabel,
  type OpdHistoryFilters,
  type OpdHistoryPeriod,
} from "./opdHistoryTypes";
import { OPD_FILTERABLE_STATUSES, type OpdClaimStatus } from "../opdTypes";

const PERIODS: OpdHistoryPeriod[] = ["this", "last", "custom"];

/**
 * FilterHolder.tsx — Year Range and Status apply the moment they change; the
 * rest sits behind "Filters" and holds its edits until Apply.
 *
 * Built from the same three controls as the Expense history filters beside it,
 * so the two screens read as one app: two outlined Selects with floating
 * labels, then a Select that opens a popover instead of a menu.
 *
 * Status is a single choice with a synthetic "All", not a multi-select:
 * `FilterHolder.tsx:99` maps "All" to an empty list and anything else to a
 * list of one.
 */
export function OpdHistoryFilters({
  filters,
  onChange,
}: {
  filters: OpdHistoryFilters;
  onChange: (next: OpdHistoryFilters) => void;
}) {
  const moreFieldRef = useRef<HTMLDivElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  // The popover edits a copy and commits on Apply, so a cancelled edit leaves
  // the live filters — and the query they drive — untouched.
  const [draftClaimId, setDraftClaimId] = useState(filters.claimId);
  const [draftStart, setDraftStart] = useState(filters.startYear);
  const [draftEnd, setDraftEnd] = useState(filters.endYear);

  const currentYear = new Date().getFullYear();
  // A fixed window rather than every year: the source's own picker does the
  // same, and a list back to 2010 is a scroll nobody needs.
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const status: string = filters.statuses[0] ?? "All";
  const extraCount = filters.claimId.trim() ? 1 : 0;

  const openMore = (anchor: HTMLElement) => {
    setDraftClaimId(filters.claimId);
    setDraftStart(filters.startYear);
    setDraftEnd(filters.endYear);
    setMoreAnchor(anchor);
  };

  return (
    <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: "wrap", alignItems: "center" }}>
      <FormControl size="small">
        <InputLabel id="opd-history-range">Year Range</InputLabel>
        <Select
          labelId="opd-history-range"
          label="Year Range"
          value={filters.period}
          sx={{ minWidth: 150 }}
          onChange={(e) => onChange({ ...filters, period: e.target.value as OpdHistoryPeriod })}
        >
          {PERIODS.map((p) => (
            <MenuItem key={p} value={p}>
              {opdPeriodLabel(p)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel id="opd-history-status">Status</InputLabel>
        <Select
          labelId="opd-history-status"
          label="Status"
          value={status}
          sx={{ minWidth: 170 }}
          onChange={(e) => {
            const picked = String(e.target.value);
            onChange({
              ...filters,
              statuses: picked === "All" ? [] : [picked as OpdClaimStatus],
            });
          }}
        >
          <MenuItem value="All">All</MenuItem>
          {OPD_FILTERABLE_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {opdStatusMeta(s).label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" ref={moreFieldRef}>
        <Select
          value=""
          displayEmpty
          open={false}
          sx={{ minWidth: 130 }}
          onOpen={() => {
            if (moreFieldRef.current) openMore(moreFieldRef.current);
          }}
          // No floating label: the funnel and the word sit INSIDE the field,
          // the way the source app draws this control, while the field itself
          // stays the same outlined box as the two Selects beside it.
          renderValue={() => (
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterIcon size={15} />
              <span>Filters{extraCount > 0 ? ` (${extraCount})` : ""}</span>
            </Stack>
          )}
          inputProps={{ "aria-label": "Filters" }}
        />
      </FormControl>

      <Popover
        open={Boolean(moreAnchor)}
        anchorEl={moreAnchor}
        onClose={() => setMoreAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { p: 2, width: 280 } } }}
      >
        <Stack spacing={2}>
          {/* Only a custom range has ends to pick; This/Last Year decide their
              own, so the pickers would be two controls that change nothing. */}
          {filters.period === "custom" && (
            <Stack direction="row" spacing={1}>
              <TextField
                select
                size="small"
                label="From"
                fullWidth
                value={draftStart}
                onChange={(e) => setDraftStart(Number(e.target.value))}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="To"
                fullWidth
                value={draftEnd}
                onChange={(e) => setDraftEnd(Number(e.target.value))}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          <TextField
            size="small"
            label="Claim ID"
            placeholder="OPD-…"
            fullWidth
            value={draftClaimId}
            onChange={(e) => setDraftClaimId(e.target.value)}
          />

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              size="small"
              onClick={() => {
                onChange(emptyOpdHistoryFilters());
                setMoreAnchor(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Clear
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                onChange({
                  ...filters,
                  claimId: draftClaimId,
                  startYear: draftStart,
                  endYear: draftEnd,
                });
                setMoreAnchor(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Apply
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </Stack>
  );
}

