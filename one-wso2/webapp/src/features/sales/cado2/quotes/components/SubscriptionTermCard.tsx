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


import type { JSX } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Alert,
  Chip,
  DatePickers,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { CalendarDaysIcon, LockIcon } from "@wso2/oxygen-ui-icons-react";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { useAccountOpportunities } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type { TermMode } from "@features/sales/cado2/quotes/api/quoteTypes";
import {
  YEAR_OPTIONS,
  durationText,
  endDateFor,
  endDateProblem,
  formatDate,
  hasRecurring,
  latestEndDate,
  parseDateString,
  termEnd,
  toDateString,
  type DraftFormValues,
} from "@features/sales/cado2/quotes/form/draftForm";
import { lockedRenewalStart } from "@features/sales/cado2/quotes/form/renewalStart";
import { useFieldIssue } from "@features/sales/cado2/quotes/components/fieldIssues";

const { DatePicker } = DatePickers;

/** How the AM sets the end (D85). */
const END_BY: readonly { value: TermMode; label: string }[] = [
  { value: "YEARS", label: "Number of years" },
  { value: "END_DATE", label: "End date" },
];

/**
 * Which approval the term's length leads to, if any: under a year for every
 * deal (D85), over 3 years (the extended-term rule).
 */
function approvalHint(start: string, end: string): string {
  if (!start || !end) return "";
  if (end < endDateFor(start, 1)) return "A term under a year needs approval.";
  if (end > endDateFor(start, 3)) return "A term over 3 years needs extended-term approval.";
  return "";
}

/**
 * Step 2's Term card (D85), first on the step (D90): when the quote starts
 * and how long it runs. Billing has its own card since D86.
 *
 *   Start     pre-filled from the opportunity. A renewal's is locked: its
 *             Subs_Start_Date__c, else the day after the renewed one ends
 *   End by    Number of years (1–10): the end is worked out
 *             End date: any date up to 10 years, e.g. 1 year + 1 day
 *   Duration  always shown in words, with the approval it needs
 *   No products yet: the term too, so it can be set before adding them
 *   Products but none recurs: the start date only, titled "Start Date"
 */
export default function SubscriptionTermCard(): JSX.Element {
  const { control, setValue } = useFormContext<DraftFormValues>();
  const [accountId, opportunityId, isRenewal, previousIds, startDate, termMode, termYears, termEndDate, lines] =
    useWatch({
      control,
      name: [
        "accountId",
        "opportunityId",
        "isRenewal",
        "previousOpportunityIds",
        "startDate",
        "termMode",
        "termYears",
        "termEndDate",
        "lines",
      ],
    });
  // A renewal's start: its own opportunity (an open one), else the renewed ones (won).
  const open = useAccountOpportunities(isRenewal && accountId ? accountId : null);
  const won = useAccountOpportunities(isRenewal && accountId ? accountId : null, "won");
  const locked = isRenewal
    ? lockedRenewalStart(
        (open.data ?? []).find((o) => o.id === opportunityId),
        (won.data ?? []).filter((o) => previousIds.includes(o.id)),
      )
    : null;
  const recurring = hasRecurring(lines);
  // Before any product, the term is asked too: most quotes are subscriptions.
  const asksTerm = recurring || lines.length === 0;
  const end = termEnd({ startDate, termMode, termYears, termEndDate });
  const duration = durationText(startDate, end);
  const hint = approvalHint(startDate, end);

  const startIssue = useFieldIssue("subscriptionStartDate");
  const modeIssue = useFieldIssue("termMode");
  const yearsIssue = useFieldIssue("termYears");
  const endIssue = useFieldIssue("subscriptionEndDate");
  const endProblem = termMode === "END_DATE" ? endDateProblem(startDate, termEndDate) : "";

  // Switching keeps the same end, so nothing moves until the AM changes it.
  const chooseEndBy = (mode: TermMode) => {
    if (mode === "END_DATE") setValue("termEndDate", end, { shouldDirty: true });
    setValue("termMode", mode, { shouldDirty: true });
  };

  return (
    <SectionCard
      // "Start Date" only once there are lines and none recurs: an empty quote is most likely a subscription.
      title={asksTerm ? "Subscription Term" : "Start Date"}
      icon={<CalendarDaysIcon size={18} />}
      aside={
        recurring && startDate && end ? (
          <Chip size="small" variant="outlined" color="primary" label={`${formatDate(startDate)} – ${formatDate(end)}`} />
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Start date"
              value={parseDateString(field.value)}
              readOnly={Boolean(locked)}
              onChange={(d: Date | null) => field.onChange(d && !Number.isNaN(d.getTime()) ? toDateString(d) : "")}
              slotProps={{
                textField: {
                  size: "small",
                  required: true,
                  error: Boolean(startIssue),
                  helperText:
                    startIssue ??
                    (locked
                      ? locked.source === "OPPORTUNITY"
                        ? "The opportunity's subscription start date in Salesforce"
                        : `The day after ${locked.fromName || "the renewed opportunity"} ends, in Salesforce`
                      : undefined),
                  InputProps: locked ? { endAdornment: <LockIcon size={14} aria-label="Locked" /> } : undefined,
                  sx: { maxWidth: 260 },
                },
              }}
            />
          )}
        />
        {isRenewal && !locked && !open.isPending && !won.isPending ? (
          <Alert severity="info" variant="outlined">
            Salesforce has neither this opportunity&apos;s subscription start date (<code>Subs_Start_Date__c</code>)
            nor the renewed opportunity&apos;s end date (<code>Subs_End_Date__c</code>), so the start date can&apos;t
            be worked out. Choose it.
          </Alert>
        ) : null}

        {asksTerm ? (
          <>
            <Stack spacing={1}>
              <Typography variant="body2">Set the end by</Typography>
              <RadioGroup row value={termMode} onChange={(_, v) => chooseEndBy(v as TermMode)} aria-label="Set the end by">
                {END_BY.map((o) => (
                  <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
                ))}
              </RadioGroup>
              {modeIssue ? (
                <Typography variant="caption" color="error">
                  {modeIssue}
                </Typography>
              ) : null}
            </Stack>

            {termMode === "YEARS" ? (
              <Controller
                name="termYears"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Years"
                    size="small"
                    sx={{ maxWidth: 260 }}
                    error={Boolean(yearsIssue)}
                    helperText={yearsIssue ?? (end ? `Ends ${formatDate(end)}` : undefined)}
                  >
                    {YEAR_OPTIONS.map((n) => (
                      <MenuItem key={n} value={String(n)}>
                        {n === 1 ? "1 year" : `${n} years`}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            ) : null}

            {termMode === "END_DATE" ? (
              <Controller
                name="termEndDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="End date"
                    value={parseDateString(field.value)}
                    minDate={parseDateString(startDate) ?? undefined}
                    maxDate={startDate ? (parseDateString(latestEndDate(startDate)) ?? undefined) : undefined}
                    onChange={(d: Date | null) => field.onChange(d && !Number.isNaN(d.getTime()) ? toDateString(d) : "")}
                    slotProps={{
                      textField: {
                        size: "small",
                        required: true,
                        error: Boolean(endProblem || endIssue),
                        helperText: endProblem || endIssue || undefined,
                        sx: { maxWidth: 260 },
                      },
                    }}
                  />
                )}
              />
            ) : null}

            {duration ? (
              <Stack spacing={0.25} aria-label="Duration">
                <Typography variant="body2">
                  Duration: <strong>{duration}</strong>
                </Typography>
                {hint ? (
                  <Typography variant="body2" color="text.secondary">
                    {hint}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}

          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No recurring products, so no subscription term. Only the contract total (TCV) applies.
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
