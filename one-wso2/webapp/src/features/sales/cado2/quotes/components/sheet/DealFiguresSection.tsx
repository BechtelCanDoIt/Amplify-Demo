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

import type { JSX, ReactNode } from "react";
import { Box, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@wso2/oxygen-ui";
import { CalculatorIcon, ReceiptIcon, RepeatIcon, ScaleIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { dealFigures, NOT_APPLICABLE, type QuoteSheet } from "@features/sales/cado2/quotes/sheet/sheetModel";
import { formatMoney } from "@features/sales/cado2/utils/money";

type Tone = "primary" | "secondary" | "info" | "success";

/** One figure: an icon, the number, and how it was worked out. */
function Figure({
  icon,
  tone,
  label,
  value,
  children,
}: {
  icon: ReactNode;
  tone: Tone;
  label: string;
  value: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, display: "flex", gap: 1.5, alignItems: "flex-start" }} aria-label={label}>
      <Box
        aria-hidden
        sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 1.5, display: "grid", placeItems: "center", color: `${tone}.main`, bgcolor: "action.selected" }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.3 }}>
          {label}
        </Typography>
        <Typography variant="h6" component="p" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          {children}
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * ARR, TCV and ACV, each with its workings, and each
 * product's share (a one-time service adds to TCV but not ARR).
 */
export default function DealFiguresSection({
  sheet,
}: {
  sheet: Pick<QuoteSheet, "totals" | "lines" | "years" | "currency"> &
    Partial<Pick<QuoteSheet, "partnerCommissionPercent">>;
}): JSX.Element {
  const f = dealFigures(sheet);
  const money = (v: string) => `${sheet.currency} ${formatMoney(v)}`.trim();
  const plus = (parts: readonly string[]) => parts.join(" + ");

  return (
    <SectionCard title="Deal Figures" icon={<CalculatorIcon size={18} />}>
      {!f ? (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
          Appears once the quote can be priced
        </Typography>
      ) : (
        <Stack spacing={2}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0,1fr))" }, gap: 1.5 }}>
            <Figure icon={<RepeatIcon size={20} />} tone="secondary" label="ARR · annual recurring revenue" value={f.arr ? money(f.arr) : NOT_APPLICABLE}>
              {f.arr ? (
                <>
                  One year of every Subscription and Support line
                  <br />
                  {plus(f.arrParts.map((p) => `${p.productName} ${formatMoney(p.amount)}`))}
                  {f.arrExcluded.length ? (
                    <>
                      <br />
                      Left out, one-time: {f.arrExcluded.join(", ")}
                    </>
                  ) : null}
                </>
              ) : (
                "No subscriptions or support: only TCV applies"
              )}
            </Figure>
            <Figure icon={<ReceiptIcon size={20} />} tone="primary" label="TCV · total contract value" value={money(f.tcv)}>
              Everything the customer pays over the term
              {f.tcvParts.length > 1 ? (
                <>
                  <br />
                  {plus(f.tcvParts.map((p) => `Year ${p.yearNumber} ${formatMoney(p.amount)}`))}
                </>
              ) : null}
            </Figure>
            <Figure icon={<ScaleIcon size={20} />} tone="info" label="ACV · average per contract year" value={f.acv ? money(f.acv) : NOT_APPLICABLE}>
              {f.acv && f.contractYears
                ? `TCV ÷ ${f.contractYears} contract year${f.contractYears === "1" ? "" : "s"}${Number(f.contractYears) < 1 ? " (a shorter term is scaled up to a year)" : ""}`
                : "No subscriptions or support: only TCV applies"}
            </Figure>
            {/* Commission and net order value are in the order form's totals (C2, 2026-10-14). */}
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small" aria-label="Figures by product">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">ARR</TableCell>
                  <TableCell align="right">TCV</TableCell>
                  {f.partner ? <TableCell align="right">Commission</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {f.byProduct.map((p) => (
                  <TableRow key={p.number}>
                    <TableCell>{p.productName}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {p.arr === null ? "One-time" : formatMoney(p.arr)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(p.tcv)}
                    </TableCell>
                    {f.partner ? (
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatMoney(p.commission)}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 700, borderBottom: 0 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, borderBottom: 0, fontVariantNumeric: "tabular-nums" }}>
                    {f.arr ? formatMoney(f.arr) : NOT_APPLICABLE}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, borderBottom: 0, fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(f.tcv)}
                  </TableCell>
                  {f.partner ? (
                    <TableCell align="right" sx={{ fontWeight: 700, borderBottom: 0, fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(f.partner.commission)}
                    </TableCell>
                  ) : null}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </SectionCard>
  );
}
