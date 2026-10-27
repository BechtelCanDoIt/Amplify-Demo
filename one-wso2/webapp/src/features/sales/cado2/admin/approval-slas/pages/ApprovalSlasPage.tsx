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

import { useState, type FormEvent, type JSX } from "react";
import {
  Button,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { HistoryIcon, TimerIcon } from "@wso2/oxygen-ui-icons-react";
import EmptyState from "@features/sales/cado2/components/empty-state/EmptyState";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import type { ApprovalSlaPolicy } from "@features/sales/cado2/approvals/api/approvalTypes";
import { useApprovalSlaChanges, useApprovalSlas, useSaveApprovalSlas } from "@features/sales/cado2/admin/approval-slas/api/useApprovalSlas";

/**
 * CadO2 Admin → Approval SLAs: how long each approver role has to
 * act, in calendar hours, and when a step counts as at risk. A change
 * applies to steps that start afterwards; deadlines already running stay.
 */
export default function ApprovalSlasPage(): JSX.Element {
  const policy = useApprovalSlas();
  const changes = useApprovalSlaChanges();
  // Here, not in the form: the form remounts with the stored values after a save.
  const save = useSaveApprovalSlas();
  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <PageHeader title="Approval SLAs" />
      {policy.error ? (
        <ErrorNotice error={policy.error} onRetry={() => void policy.refetch()} retrying={policy.isFetching}>
          Couldn&apos;t load the SLAs.
        </ErrorNotice>
      ) : policy.data ? (
        // Keyed by the loaded values, so a save shows what was stored.
        <SlaForm key={JSON.stringify(policy.data)} policy={policy.data} save={save} />
      ) : (
        <Skeleton variant="rounded" height={420} />
      )}
      <SectionCard title="Change Log" icon={<HistoryIcon size={16} />}>
        {changes.error ? (
          <ErrorNotice error={changes.error} onRetry={() => void changes.refetch()} retrying={changes.isFetching}>
            Couldn&apos;t load the change log.
          </ErrorNotice>
        ) : !changes.data ? (
          <Skeleton variant="rounded" height={60} />
        ) : changes.data.length === 0 ? (
          <EmptyState compact icon={<HistoryIcon size={20} />} title="No changes yet" body="Every role has the default 24 hours." />
        ) : (
          <Stack component="ul" spacing={1} aria-label="SLA changes" sx={{ m: 0, pl: 2.5 }}>
            {changes.data.map((c) => {
              const unit = c.setting === "SLA_AT_RISK_PERCENT" ? " %" : " h";
              return (
                <Typography key={c.id} component="li" variant="body2">
                  <b>{c.label}</b>: {c.oldValue}
                  {unit} → {c.newValue}
                  {unit}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {" "}
                    · {changedText(c.changedAt, c.changedByEmail)}
                  </Typography>
                </Typography>
              );
            })}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}

function SlaForm({ policy, save }: { policy: ApprovalSlaPolicy; save: ReturnType<typeof useSaveApprovalSlas> }): JSX.Element {
  const notify = useCado2Toast();
  const [hours, setHours] = useState<Record<string, string>>(() =>
    Object.fromEntries(policy.roles.map((r) => [r.role, String(r.hours)])),
  );
  const [atRisk, setAtRisk] = useState(String(policy.atRiskPercent));

  const whole = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  const hoursProblem = (v: string) => {
    const n = whole(v);
    return Number.isNaN(n) || n < policy.minHours || n > policy.maxHours ? `${policy.minHours}–${policy.maxHours} hours` : null;
  };
  const atRiskN = whole(atRisk);
  const atRiskProblem = Number.isNaN(atRiskN) || atRiskN < 1 || atRiskN > 99 ? "1–99 %" : null;
  const changed =
    policy.roles.some((r) => whole(hours[r.role] ?? "") !== r.hours) || atRiskN !== policy.atRiskPercent;
  const invalid = Boolean(atRiskProblem) || policy.roles.some((r) => hoursProblem(hours[r.role] ?? ""));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid || !changed) return;
    save.mutate(
      { hours: Object.fromEntries(policy.roles.map((r) => [r.role, whole(hours[r.role] ?? "")])), atRiskPercent: atRiskN },
      { onSuccess: () => notify("Saved. New approvals use these times.") },
    );
  };

  return (
    <SectionCard title="Response Time per Role" icon={<TimerIcon size={16} />}>
      <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
        <Typography variant="body2" color="text.secondary">
          How long a role has to act once a quote reaches its step, in calendar hours (nights and weekends count). A change applies to
          approvals that start after you save; approvals already waiting keep their deadline.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="SLA per role">
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell align="right">Respond within</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policy.roles.map((r) => {
                const problem = hoursProblem(hours[r.role] ?? "");
                return (
                  <TableRow key={r.role}>
                    <TableCell>{r.roleLabel}</TableCell>
                    <TableCell align="right">
                      <TextField
                        id={`sla-${r.role}`}
                        size="small"
                        value={hours[r.role] ?? ""}
                        onChange={(e) => {
                          save.reset();
                          setHours((h) => ({ ...h, [r.role]: e.target.value }));
                        }}
                        error={Boolean(problem)}
                        helperText={problem}
                        slotProps={{
                          htmlInput: { inputMode: "numeric", "aria-label": `${r.roleLabel}: hours to respond` },
                          input: { endAdornment: <InputAdornment position="end">hours</InputAdornment> },
                        }}
                        sx={{ width: 150 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TextField
          id="sla-at-risk"
          size="small"
          label="At risk from"
          value={atRisk}
          onChange={(e) => {
            save.reset();
            setAtRisk(e.target.value);
          }}
          error={Boolean(atRiskProblem)}
          helperText={atRiskProblem ?? "A waiting approval turns amber once this share of its time has gone"}
          slotProps={{ htmlInput: { inputMode: "numeric" }, input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          sx={{ maxWidth: 260 }}
        />
        {save.error ? <ErrorNotice error={save.error}>Couldn&apos;t save the SLAs.</ErrorNotice> : null}
        <Stack direction="row">
          <Button type="submit" variant="contained" disabled={!changed || invalid || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
