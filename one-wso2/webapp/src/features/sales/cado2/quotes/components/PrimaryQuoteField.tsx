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

import { useEffect, useRef, useState, type JSX } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Checkbox, FormControlLabel, Stack, Typography } from "@wso2/oxygen-ui";
import { useOpportunityQuotes } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type { DraftFormValues } from "@features/sales/cado2/quotes/form/draftForm";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import { primaryLabel } from "@features/sales/cado2/quotes/lifecycle/lifecycle";

interface PrimaryQuoteFieldProps {
  /** The quote being edited; null before its first save. */
  readonly quoteId: number | null;
  readonly opportunityId: string;
}

/**
 * Overview's "Primary quote" tick (D68). The opportunity's primary quote is the
 * one synced to Salesforce. Ticked by default on the opportunity's first quote;
 * the AM can untick it. Ticking it while another quote is primary asks first,
 * because saving releases that one. Saved with the draft.
 */
export default function PrimaryQuoteField({
  quoteId,
  opportunityId,
}: PrimaryQuoteFieldProps): JSX.Element {
  const { control, setValue } = useFormContext<DraftFormValues>();
  const isPrimary = useWatch({ control, name: "isPrimary" });
  const quotes = useOpportunityQuotes(opportunityId || null);
  const [confirming, setConfirming] = useState(false);

  // The opportunity's first quote starts ticked, once per chosen opportunity.
  const defaultedFor = useRef<string | null>(null);
  useEffect(() => {
    if (
      quoteId !== null ||
      !quotes.data ||
      defaultedFor.current === opportunityId
    )
      return;
    defaultedFor.current = opportunityId;
    setValue("isPrimary", quotes.data.length === 0, { shouldDirty: true });
  }, [quoteId, quotes.data, opportunityId, setValue]);

  const current = quotes.data?.find(
    (q) => q.isPrimary && q.quoteId !== quoteId,
  );
  const tick = (checked: boolean) => {
    if (checked && current) {
      setConfirming(true);
      return;
    }
    setValue("isPrimary", checked, { shouldDirty: true });
  };

  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Checkbox
            checked={isPrimary}
            onChange={(_, checked) => tick(checked)}
          />
        }
        label="Primary quote for this opportunity"
      />
      <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>
        Only the primary quote is synced to Salesforce.{" "}
        {current && !isPrimary
          ? `The primary quote is ${primaryLabel(current)}.`
          : current && isPrimary
            ? `Saving releases ${primaryLabel(current)}.`
            : ""}
      </Typography>
      {confirming && current ? (
        <LifecycleDialog
          title="Make this the primary quote?"
          confirmLabel="Make primary"
          pending={false}
          error={null}
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setValue("isPrimary", true, { shouldDirty: true });
            setConfirming(false);
          }}
        >
          {`${primaryLabel(current)} is the primary quote for this opportunity. Saving this quote as primary releases it.`}
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}
