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
import {
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { LockIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import {
  useQuoteAccess,
  useSaveQuoteAccess,
} from "@features/sales/cado2/admin/quote-access/api/useQuoteAccess";
import type { QuoteAccess } from "@features/sales/cado2/quotes/api/quoteTypes";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";

const OPTIONS: readonly { value: QuoteAccess; label: string; help: string }[] =
  [
    {
      value: "VIEW",
      label: "View",
      help: "Every AM sees every quote, drafts included. Only a quote's owner changes it.",
    },
    {
      value: "VIEW_EDIT",
      label: "View and edit",
      help: "Every AM can also do everything the owner can: edit drafts, submit, recall, revise, close, and change the primary quote.",
    },
  ];

/**
 * CadO2 Admin → Quote access (D69): what AMs may do with quotes they don't
 * own. Every change on a quote is in its history with who made it.
 */
export default function QuoteAccessPage(): JSX.Element {
  const setting = useQuoteAccess();
  const save = useSaveQuoteAccess();
  const notify = useCado2Toast();
  const [choice, setChoice] = useState<QuoteAccess | null>(null);
  const current = setting.data?.access;
  const selected = choice ?? current ?? "VIEW";

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <PageHeader title="Quote Access" />
      <SectionCard
        title="Quotes Owned by Someone Else"
        icon={<LockIcon size={16} />}
      >
        {setting.error ? (
          <ErrorNotice
            error={setting.error}
            onRetry={() => void setting.refetch()}
            retrying={setting.isFetching}
          >
            Couldn&apos;t load the quote access setting.
          </ErrorNotice>
        ) : setting.isPending ? (
          <Skeleton
            variant="rounded"
            height={120}
            aria-label="Loading quote access"
          />
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Other AMs can:
            </Typography>
            <RadioGroup
              value={selected}
              onChange={(_, v) => {
                setChoice(v as QuoteAccess);
                save.reset();
              }}
              aria-label="Other AMs can"
            >
              {OPTIONS.map((o) => (
                <FormControlLabel
                  key={o.value}
                  value={o.value}
                  control={<Radio />}
                  label={
                    <Stack>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {o.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {o.help}
                      </Typography>
                    </Stack>
                  }
                  sx={{
                    alignItems: "flex-start",
                    mb: 1,
                    "& .MuiRadio-root": { pt: 0.25 },
                  }}
                />
              ))}
            </RadioGroup>
            {save.error ? (
              <ErrorNotice error={save.error}>
                Couldn&apos;t save the quote access setting.
              </ErrorNotice>
            ) : null}
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="contained"
                disabled={selected === current || save.isPending}
                onClick={() =>
                  save.mutate(selected, {
                    onSuccess: () => {
                      setChoice(null);
                      notify("Quote access saved");
                    },
                  })
                }
              >
                {save.isPending ? "Saving…" : "Save"}
              </Button>
              {setting.data.updatedByEmail && setting.data.updatedAt ? (
                <Typography variant="caption" color="text.secondary">
                  Last changed {changedText(setting.data.updatedAt, setting.data.updatedByEmail)}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
