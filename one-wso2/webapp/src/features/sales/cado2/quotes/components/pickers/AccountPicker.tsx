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
import { Autocomplete, Avatar, Box, Button, Paper, Stack, TextField, Typography } from "@wso2/oxygen-ui";
import { SearchIcon } from "@wso2/oxygen-ui-icons-react";
import { useDebouncedValue } from "@hooks/useDebouncedValue";
import { MIN_ACCOUNT_SEARCH, useAccountSearch } from "@features/sales/cado2/quotes/api/useQuoteApi";
import type { Account } from "@features/sales/cado2/quotes/api/quoteTypes";
import { initialsOfName } from "@features/sales/cado2/utils/initials";

interface AccountPickerProps {
  /** The chosen account's name, or "" when none. */
  readonly chosenName: string;
  /** After the first save the account is fixed. */
  readonly locked: boolean;
  readonly onChoose: (account: Account | null) => void;
}

const place = (a: Account) => [a.billingAddress?.city, a.billingAddress?.country].filter(Boolean).join(", ");

/**
 * Account first (F5 feedback): search Salesforce accounts with rich results;
 * once chosen, the account shows as a card with Change.
 */
export default function AccountPicker({ chosenName, locked, onChoose }: AccountPickerProps): JSX.Element {
  const [term, setTerm] = useState("");
  const accounts = useAccountSearch(useDebouncedValue(term, 300));

  if (chosenName) {
    return (
      <Paper
        variant="outlined"
        aria-label="Chosen account"
        sx={{ p: 2, borderRadius: 2, borderLeft: 4, borderLeftColor: "primary.main" }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{ width: 48, height: 48, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 700 }}
          >
            {initialsOfName(chosenName)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4, display: "block" }}>
              Account
            </Typography>
            <Typography variant="h6" component="p" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {chosenName}
            </Typography>
          </Box>
          {locked ? null : (
            <Button onClick={() => onChoose(null)} aria-label="Change account">
              Change
            </Button>
          )}
        </Stack>
      </Paper>
    );
  }
  // Nothing is chosen yet: point the AM at where to begin (F5 review).
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: 2,
        borderRadius: 2,
        borderWidth: 2,
        borderColor: "primary.main",
        bgcolor: "action.selected",
        position: "relative",
        // A soft ring that fades out, in the theme's own focus tint.
        "@keyframes cado2Pulse": {
          "0%": { boxShadow: `0 0 0 0 ${theme.palette.action.focus}` },
          "100%": { boxShadow: "0 0 0 8px transparent" },
        },
        animation: "cado2Pulse 1.6s ease-out 3",
      })}
    >
      {/* No "Start here" tag (2026-09-28): the search is the only thing on screen until an account is chosen. */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Choose the Salesforce account this quote is for.
      </Typography>
      <Autocomplete
        options={accounts.data ?? []}
        getOptionLabel={(a) => a.name ?? a.id}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(x) => x}
        loading={accounts.isFetching}
        onInputChange={(_, v) => setTerm(v)}
        onChange={(_, a) => a && onChoose(a)}
        noOptionsText={
          term.trim().length < MIN_ACCOUNT_SEARCH
            ? "Type at least 3 letters"
            : accounts.error
              ? "Couldn't search Salesforce. Try again." // not "No matching accounts" (2026-10-13)
              : "No matching accounts"
        }
        renderOption={({ key, ...props }, a) => (
          <li key={key} {...props}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
              <Avatar
                sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "primary.main", color: "primary.contrastText" }}
              >
                {initialsOfName(a.name ?? "?")}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {a.name ?? a.id}
                </Typography>
                {place(a) ? (
                  <Typography variant="caption" color="text.secondary">
                    {place(a)}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Account"
            placeholder="Search Salesforce accounts"
            required
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <SearchIcon size={16} style={{ marginLeft: 4, marginRight: 4 }} />
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Paper>
  );
}
