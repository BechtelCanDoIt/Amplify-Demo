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
  Box,
  Button,
  ButtonBase,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@wso2/oxygen-ui";
import { ChevronRightIcon } from "@wso2/oxygen-ui-icons-react";
import { StatusChip, opdStatusMeta } from "../../components/FinanceChips";
import { money } from "../../util/financeFormat";
import { historyDate } from "./opdHistoryFormat";
import type { OpdClaim } from "../opdTypes";

/**
 * The claims, one per row.
 *
 * `ClaimTable.tsx` in the source, minus the finance columns: this screen is
 * the submitter's own history, so there is no User column and no Review
 * button. Its own table rather than the one the Me-side OPD tab renders,
 * which is shared with Approvals and has no way into the activity trail.
 */
export function OpdHistoryTable({
  claims,
  onView,
  onShowActivity,
}: {
  claims: OpdClaim[];
  onView: (claim: OpdClaim) => void;
  onShowActivity: (claim: OpdClaim) => void;
}) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                fontSize: 11,
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              },
            }}
          >
            <TableCell>Claim ID</TableCell>
            <TableCell>Submitted Date</TableCell>
            <TableCell align="right">Total Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {claims.map((claim) => {
            const meta = opdStatusMeta(claim.statusDetails.status);
            return (
              <TableRow key={claim.id} hover>
                <TableCell sx={{ fontSize: 12.5, fontFamily: "monospace" }}>{claim.id}</TableCell>
                <TableCell sx={{ fontSize: 12.5 }}>{historyDate(claim.createdDate)}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                  {money(claim.totalAmount)}
                </TableCell>
                <TableCell>
                  {/* ClaimTable.tsx:154-180 — the status is the way into the
                      activity trail, which is what the chevron promises. */}
                  <ButtonBase
                    onClick={() => onShowActivity(claim)}
                    // The label carries the status as well as the id: an
                    // aria-label REPLACES the name computed from the contents,
                    // so without the status in it a screen reader would get no
                    // status for the row at all.
                    aria-label={`Claim activity for ${claim.id} — ${meta.label}`}
                    sx={{ borderRadius: 5, display: "flex", alignItems: "center", gap: 0.25, p: 0.25 }}
                  >
                    <StatusChip label={meta.label} color={meta.color} />
                    <ChevronRightIcon size={13} />
                  </ButtonBase>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onView(claim)}
                      aria-label={`View claim ${claim.id}`}
                      sx={{ textTransform: "none" }}
                    >
                      View
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
