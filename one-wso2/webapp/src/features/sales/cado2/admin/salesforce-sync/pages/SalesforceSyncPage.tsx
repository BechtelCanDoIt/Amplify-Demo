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
import { FormControlLabel, Skeleton, Stack, Switch, Typography } from "@wso2/oxygen-ui";
import { CloudUploadIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import LifecycleDialog from "@features/sales/cado2/quotes/components/detail/LifecycleDialog";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import {
  useSalesforceSync,
  useSaveSalesforceSync,
} from "@features/sales/cado2/admin/salesforce-sync/api/useSalesforceSync";

/**
 * CadO2 Admin → Salesforce Sync (D84): whether the primary quote is written
 * to its Salesforce opportunity (D77), from "Sync to Salesforce" and before
 * every submit. A business decision, so an Admin's switch rather than a
 * server setting; it applies at once. Turning it on asks first: it changes
 * Salesforce data.
 */
export default function SalesforceSyncPage(): JSX.Element {
  const setting = useSalesforceSync();
  const save = useSaveSalesforceSync();
  const notify = useCado2Toast();
  const [confirming, setConfirming] = useState(false);

  const switchTo = (enabled: boolean) =>
    save.mutate(enabled, {
      onSuccess: () => {
        setConfirming(false);
        notify(enabled ? "Salesforce sync turned on" : "Salesforce sync turned off");
      },
    });

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <PageHeader title="Salesforce Sync" />
      <SectionCard title="Primary Quotes to Salesforce" icon={<CloudUploadIcon size={16} />}>
        {setting.error ? (
          <ErrorNotice error={setting.error} onRetry={() => void setting.refetch()} retrying={setting.isFetching}>
            Couldn&apos;t load the Salesforce sync setting.
          </ErrorNotice>
        ) : setting.isPending ? (
          <Skeleton variant="rounded" height={120} aria-label="Loading the Salesforce sync setting" />
        ) : (
          <Stack spacing={1.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={setting.data.enabled}
                  disabled={save.isPending}
                  onChange={(_, on) => {
                    save.reset();
                    if (on) setConfirming(true);
                    else switchTo(false);
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Sync quotes to Salesforce
                </Typography>
              }
            />
            <Typography variant="body2" color="text.secondary">
              When on, a primary quote is written to its Salesforce opportunity: when its AM chooses &ldquo;Sync to
              Salesforce&rdquo;, and before every submit (a refusal from Salesforce stops the submit). The opportunity&apos;s
              products, quantities, prices, discounts, dates and partner commission then match the quote. When off,
              nothing is written to Salesforce; CADO2 still reads accounts, opportunities and products from it.
            </Typography>
            {save.error && !confirming ? (
              <ErrorNotice error={save.error}>Couldn&apos;t change the Salesforce sync.</ErrorNotice>
            ) : null}
            {setting.data.updatedByEmail && setting.data.updatedAt ? (
              <Typography variant="caption" color="text.secondary">
                Last changed {changedText(setting.data.updatedAt, setting.data.updatedByEmail)}
              </Typography>
            ) : null}
          </Stack>
        )}
      </SectionCard>

      {confirming ? (
        <LifecycleDialog
          title="Turn on the Salesforce sync?"
          confirmLabel="Turn on"
          pending={save.isPending}
          error={save.error}
          onClose={() => setConfirming(false)}
          onConfirm={() => switchTo(true)}
        >
          From now on, primary quotes update their Salesforce opportunities: products not on the quote are removed
          from the opportunity. Make sure this environment is connected to the right Salesforce.
        </LifecycleDialog>
      ) : null}
    </Stack>
  );
}
